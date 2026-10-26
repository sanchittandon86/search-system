# Phase 2 — Naive Search (No Black Box Yet)

## Goal

Prove the search request/response flow end-to-end using only PostgreSQL —
no external search black box involved yet. This becomes the **fallback
path** once the black box is introduced in Phase 5 (if the black box is
down or times out, we fall back to exactly this implementation).

## Scope

**In scope:**
- `GET /products/search` with text, category, seller, price-range, and
  active-status filters
- Pagination and basic sorting (`price_asc` / `price_desc` / default
  relevance)

**Out of scope (future phases):**
- Search black box integration (Phase 5)
- Caching of search results (Phase 6, optional)
- Any ranking smarter than "name/description text match + recency"

## Matching Strategy

Plain `ILIKE '%term%'` against `products.name` and `products.description`.
Not `tsvector`/`to_tsquery` — that would require a schema migration
(generated column + GIN index) for a benefit that doesn't matter yet,
since this whole path gets replaced by the black box in Phase 5. ILIKE is
the simplest thing that proves the flow.

**Where this fits in the bigger design:** this naive matching is exactly
what the Search Black Box will replace in Phase 5 — it's deliberately
"dumb" by design, not a cut corner.

## Endpoint

### `GET /products/search`

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | matched against `name` and `description` via `ILIKE` |
| `category` | UUID | — | exact match on `category_id` |
| `sellerId` | UUID | — | exact match on `seller_id` |
| `minPrice` | number | — | `price >= minPrice` |
| `maxPrice` | number | — | `price <= maxPrice` |
| `isActive` | boolean | `true` | defaults to showing only active products; can be overridden explicitly |
| `sortBy` | `price_asc` \| `price_desc` \| `relevance` | `relevance` | `relevance` = `created_at DESC` (newest first) in this phase |
| `page` | number | `1` | |
| `limit` | number | `20` | capped at `50` |

**Example request:**
```
GET /products/search?q=comfortable shoes&category=<uuid>&minPrice=1000&maxPrice=5000&sortBy=price_asc&page=1&limit=20
```

**Response `200 OK`:**
```json
{
  "results": [
    {
      "productId": "...",
      "sellerId": "...",
      "name": "Running Shoes",
      "description": "Lightweight running shoes",
      "categoryId": "...",
      "price": 2499.00,
      "isActive": true,
      "quantity": 4,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

**Validation:**
- `minPrice`/`maxPrice`, if both provided, `minPrice <= maxPrice` → else
  `400`
- `sortBy`, if provided, must be one of `price_asc` / `price_desc` /
  `relevance` → else `400`
- `isActive`, if provided, must parse as `true`/`false` → else `400`
- `page` coerced to `>= 1`, `limit` coerced to `[1, 50]` (same convention
  as the seller product listing in Phase 1)
- `q` is optional — an empty/omitted query returns the full filtered,
  paginated catalog (useful for category browsing without typing text)

## Flow

```
GET /products/search?...
  → Search Controller parses + validates query params
  → Search Service builds a single parameterized SQL query:
      - WHERE is_active = :isActive (default true)
      - AND (name ILIKE :q OR description ILIKE :q)   [if q provided]
      - AND category_id = :category                    [if provided]
      - AND seller_id = :sellerId                       [if provided]
      - AND price BETWEEN :minPrice AND :maxPrice       [if provided]
      - ORDER BY price ASC|DESC  OR  created_at DESC     (sortBy)
      - LIMIT :limit OFFSET (:page-1)*:limit
      joined with inventory to include `quantity` in the response
  → Search Repository executes the query, returns rows + a COUNT(*) for total
  → Response: { results, page, limit, total }
```

No separate "black box call" step exists yet — the Search Service *is*
the naive implementation this phase. In Phase 5, this exact code path
becomes the `catch`/fallback branch when the black box call fails.

## Module Structure

```
src/modules/search/
  search.types.ts        -- SearchQuery, SearchResult shapes
  search.repository.ts    -- single parameterized SQL query + count
  search.service.ts       -- validation, defaulting, pagination math
  search.controller.ts    -- parses req.query, calls service
  search.routes.ts        -- GET /search, mounted under /products
```

## Testing Plan (manual, via curl)

1. Seed a few products (reuse Phase 1 seller/product endpoints) with
   varying names, categories, and prices.
2. `GET /products/search?q=running` → verify only matching products
   returned.
3. `GET /products/search?minPrice=1000&maxPrice=3000` → verify price-range
   filtering.
4. `GET /products/search?sortBy=price_asc` vs `sortBy=price_desc` →
   verify ordering flips.
5. Deactivate a product (Phase 1's `PATCH .../products/{id}` with
   `isActive: false`) → verify it disappears from default search results,
   but reappears with `?isActive=false`.
6. `GET /products/search?page=2&limit=1` with 2+ seeded products → verify
   pagination returns the correct second item and `total` is accurate.
7. Invalid input: `minPrice=5000&maxPrice=1000` → expect `400`.
8. Invalid `sortBy=bogus` → expect `400`.

## Exit Criteria

- Searching "shoes" (or any seeded term) returns active, filtered,
  paginated results using Postgres only — no external dependency involved.
- All filter combinations (`q`, `category`, `sellerId`, price range,
  `isActive`) work independently and combined.
- `npm run build` compiles with no TypeScript errors.
