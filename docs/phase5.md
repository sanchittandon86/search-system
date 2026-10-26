# Phase 5 — Search Black Box Integration (Mocked)

> **Update (post-Phase-7, demo reseed):** after reseeding the catalog to 50
> products across 8 real-brand sellers (`backend/scripts/seed-demo-data.ts`),
> filtering by a highly selective `sellerId` (e.g. a seller with ~8 of 50
> products) could return an empty result set via the black-box path, even
> with matching inventory — because `sellerId` wasn't forwarded to the black
> box, its unfiltered overfetch sample sometimes didn't include that
> seller's products at all. Fixed by forwarding `sellerId` to the black box
> as a filter (realistic: a real search engine indexes seller as filterable
> metadata), while *keeping* the post-hydration `sellerId` check as a
> defense-in-depth safety net. The "Division of Responsibility" table below
> is updated to reflect this; everything else in this doc describes the
> original Phase 5 design and still holds.

## Goal

Swap the naive Postgres search from Phase 2 for a call to a mocked search
black box, while keeping the Phase 2 implementation as the fallback when
the black box fails. Same pattern as Phase 4: the mock runs as its own
process on its own port so we can genuinely kill it and prove the
fallback, not just trust the code.

## Scope

**In scope:**
- A standalone mock service implementing `POST /search-engine/search`
- `GET /products/search` calling the black box first, with the Phase 2
  naive Postgres query as the fallback on timeout/failure
- Business filters (`sellerId`, `isActive`) and `sortBy` overrides applied
  *after* the black box responds — the black box only owns text relevance
- Pagination across the black-box path via overfetching (see note below)

**Out of scope:**
- Caching search results (Phase 6, optional)
- Circuit breaker / cooldown (Phase 7)

## Division of Responsibility (important)

Per `readme.txt`: *"the black box owns text understanding, matching,
relevance, ranking. It does NOT own product data, inventory truth, or
activation status."* Concretely in this phase:

| Filter | Who applies it |
|---|---|
| `q` (text relevance) | Black box |
| `category`, `minPrice`, `maxPrice` | Sent to black box as filters (it needs these to return a relevant candidate set) |
| `sellerId` | Sent to black box as a filter too (added post-Phase-7, see update note above), AND re-checked after hydration as a safety net |
| `isActive` | Applied by us, after hydration — the black box doesn't track our activation/inventory state |
| `sortBy=price_asc/price_desc` | Applied by us, after hydration — overrides the black box's relevance order |
| `sortBy=relevance` (default) | Black box's score order is preserved |

## Mock Service Contract

```
POST /search-engine/search
Request:  { "query": "comfortable shoes", "filters": { "category": "...", "minPrice": 1000, "maxPrice": 5000 }, "limit": 20 }
Response: { "products": [ { "productId": "...", "score": 0.92 } ], "total": 3 }
```

**Note on `total`**: the minimal example contract in the original design
only shows `products`. We extend it with `total`, since a real search
engine (OpenSearch/Elasticsearch) always reports a hit count alongside
results — without it, pagination through the black-box path would be
impossible to implement honestly. Our mock's `total` is exact (it has
full DB visibility); a real engine's is often an approximation, and
either way this `total` reflects matches at the black-box's filters only
— it does **not** account for `sellerId`/`isActive` filtering we apply
afterward, so it is treated as approximate by our Search Service.

**Mock implementation** (`mock-services/search-engine.ts`): scores by a
simple heuristic — exact name match `1.0`, name starts with query `0.9`,
name/description contains query `0.7`/`0.5`, no query provided `0.5` flat
(ordered by recency instead). Applies `category`/`minPrice`/`maxPrice`
directly in SQL. Like Phase 4's mock, it also always prepends one
hardcoded nonexistent `productId` with score `0.99`, to keep proving our
hydration step doesn't trust the black box blindly.

Run it with `npm run dev:mock:search` (default port `4002`, override with
`SEARCH_ENGINE_PORT`).

## Pagination Through the Black Box (simplification, documented)

The black-box contract only takes a `limit`, not a `page`/`offset` — this
mirrors how some real top-K ranking services work (they only promise a
ranked top-K, not arbitrary offset access). To still support pagination,
our Search Service overfetches: it requests `page * limit` candidates
from the black box, then slices out the requested page window after
hydration/filtering. This is a deliberate, acceptable simplification for
a basic system — flagged here rather than hidden, since a real system at
larger scale would want the search engine to support offset natively.

## Flow

```
GET /products/search?q=&category=&sellerId=&minPrice=&maxPrice=&isActive=&sortBy=&page=&limit=
  → Search Service calls the black box client:
      POST http://localhost:4002/search-engine/search
      { query: q, filters: { category, minPrice, maxPrice }, limit: page * limit }
      - timeout: 400ms (SEARCH_ENGINE_TIMEOUT_MS)
      - on failure (timeout, network error, non-2xx): one retry, then give up
  → On success: sort candidates by score DESC, hydrate against Product DB
    with sellerId/isActive filters applied (JOIN inventory, quantity > 0),
    preserving black-box order unless sortBy overrides it
  → Apply sortBy=price_asc/price_desc re-sort if requested
  → Slice the requested page window out of the (overfetched) ordered list
  → Return { results, page, limit, total }
  → On black-box failure after retry: fall back directly to the Phase 2
    naive Postgres ILIKE query (exact same code from Phase 2, unchanged)
```

## Module Structure

```
mock-services/
  search-engine.ts            -- standalone Express app, own port, own process

src/modules/search/
  search.types.ts               -- unchanged from Phase 2
  search.client.ts                -- NEW: HTTP call to the black box, timeout + 1 retry
  search.repository.ts             -- Phase 2's naive query (now the fallback) +
                                       NEW hydrateFiltered(ids, {sellerId, isActive})
  search.service.ts                 -- NEW: black-box-first orchestration with fallback
  search.controller.ts               -- unchanged
  search.routes.ts                    -- unchanged
```

## Testing Plan (manual, via curl)

1. Start the main app (`npm run dev`) and the mock
   (`npm run dev:mock:search`).
2. `GET /products/search?q=comfortable` → verify results come back in
   black-box relevance order, and the hardcoded invalid product ID never
   appears.
3. `GET /products/search?q=comfortable&sellerId=<other seller>` → verify
   `sellerId` filtering (which the black box knows nothing about) still
   works correctly post-hydration.
4. `GET /products/search?sortBy=price_asc` → verify the black box's
   relevance order is overridden by price ordering.
5. Deactivate a product that would otherwise match → verify it's filtered
   out of black-box results too (same hydration step as fallback).
6. Kill the mock process entirely → re-run the same search → verify `200`
   with results still returned via the Phase 2 Postgres fallback, not an
   error or a hang.
7. Restart the mock → verify results go back through the black-box path.
8. Pagination: `page=1&limit=1` vs `page=2&limit=1` with 2+ matches →
   verify distinct, correctly ordered results on each page via the
   black-box path.

## Exit Criteria

- Search works end-to-end through the black-box path with correct
  relevance ordering, and business filters (`sellerId`, `isActive`,
  `sortBy` override) are correctly applied after hydration.
- Killing the mock process still serves results via the unchanged Phase 2
  fallback — search is never fully broken.
- The hardcoded invalid product ID injected by the mock never leaks into
  a response.
- `npm run build` compiles with no TypeScript errors.
