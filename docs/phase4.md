# Phase 4 — Recommendation Black Box Integration (Mocked)

## Goal

Prove the recommendation integration contract end-to-end using a stub
that stands in for "the ML team's API" — a real separate HTTP service we
call over the network, not an in-process function call. This matters: it
lets us genuinely test timeouts, retries, and fallback by starting/
stopping the mock independently of the main app, which is exactly the
failure mode this phase needs to prove out.

## Scope

**In scope:**
- A standalone mock service implementing `POST /recommendation-engine/recommend`
- `GET /recommendations?userId=&limit=` in the main app, calling the mock
  over HTTP with a timeout + one retry
- Hydration + filtering (inactive / out-of-stock / unknown product IDs
  removed) while preserving the black box's score ordering
- Fallback to trending products when the black box fails or returns
  nothing usable after filtering

**Out of scope (future phases):**
- A real ML model (never in scope for this project)
- Caching recommendation results (Phase 6, optional)
- Circuit breaker / cooldown after repeated failures (Phase 7)

## Why a Separate Process

The mock lives in `mock-services/recommendation-engine.ts` and runs as
its own process on its own port, started with its own npm script. This
is deliberate — it simulates "a vendor's external API" more honestly
than an in-process stub function would, and it means we can literally
kill the process to prove the fallback path works, rather than just
trusting the code.

## Mock Service Contract

```
POST /recommendation-engine/recommend
Request:  { "userId": "...", "limit": 20 }
Response: { "products": [ { "productId": "...", "score": 0.92 }, ... ] }
```

**Mock implementation**: picks a random sample of up to `limit` products
from the `products` table (any active/inactive mix — intentionally, so
we can prove our own filtering works) and assigns descending fake scores.
It also always prepends one hardcoded, nonexistent `productId`
(`00000000-0000-0000-0000-000000000000`) with the highest score — this
simulates a real-world case where the black box returns a stale/deleted
product ID, and proves our hydration step filters it out rather than
trusting the black box's response blindly.

Run it with `npm run dev:mock:recommendation` (default port `4001`,
override with `MOCK_RECOMMENDATION_PORT`).

## Endpoint (main app)

### `GET /recommendations?userId=&limit=`

**Response `200 OK`:**
```json
{
  "recommendations": [
    { "productId": "...", "name": "...", "price": 2499.00, "isActive": true, "quantity": 4, "...": "..." }
  ],
  "source": "personalized"
}
```

`source` is either `"personalized"` (black box succeeded and returned at
least one usable product) or `"fallback"` (black box failed, timed out,
or returned nothing usable after filtering).

**Validation:**
- `userId` required → else `400`
- `limit` defaults to `20`, capped at `50` (same convention as other
  listing endpoints)

## Flow

```
GET /recommendations?userId=&limit=
  → Recommendation Service calls the black box client:
      POST http://localhost:4001/recommendation-engine/recommend
      { userId, limit }
      - timeout: 400ms (RECOMMENDATION_TIMEOUT_MS)
      - on failure (timeout, network error, non-2xx): one retry, then give up
  → On success: sort candidates by score DESC, hydrate against Product DB
    (JOIN inventory), filter out is_active=false, quantity<=0, and unknown
    productIds — while preserving the score-based order
  → If the filtered list is non-empty → return it, source="personalized"
  → If the black box call fails after retry, OR the filtered list is
    empty → fall back to trending products, source="fallback"
```

## Fallback: Trending Products

```sql
-- Primary: top N products by recent PURCHASED event count
SELECT p.*, i.quantity, COUNT(ue.event_id) AS purchase_count
FROM user_events ue
JOIN products p ON p.product_id = ue.product_id
JOIN inventory i ON i.product_id = p.product_id
WHERE ue.event_type = 'PURCHASED' AND p.is_active = true AND i.quantity > 0
GROUP BY p.product_id, i.quantity
ORDER BY purchase_count DESC
LIMIT :limit;

-- Padding: if fewer than `limit` purchased products exist (e.g. fresh DB
-- with no purchase history), pad with newest active, in-stock products
-- not already included.
```

This directly matches `readme.txt`'s stated fallback: *"Recommendation
black box down → fall back to trending/popular products."*

## Module Structure

```
mock-services/
  recommendation-engine.ts   -- standalone Express app, own port, own process

src/modules/recommendation/
  recommendation.types.ts
  recommendation.client.ts    -- HTTP call to the black box, timeout + 1 retry
  recommendation.repository.ts -- hydrate-by-ids + trending-fallback queries
  recommendation.service.ts    -- orchestration: call → hydrate/filter → fallback
  recommendation.controller.ts
  recommendation.routes.ts     -- GET /recommendations
```

## Testing Plan (manual, via curl)

1. Start the main app (`npm run dev`) and the mock
   (`npm run dev:mock:recommendation`).
2. `GET /recommendations?userId=<existing user>` → verify `source:
   "personalized"`, and confirm the hardcoded invalid product ID from the
   mock does **not** appear in the response.
3. Deactivate one of the products the mock might return → re-run → verify
   it's filtered out (still `source: "personalized"` as long as other
   valid products remain).
4. Kill the mock process entirely → re-run the same request → verify
   `200` with `source: "fallback"` and a non-empty trending list, not an
   error.
5. Restart the mock, fire a few `PURCHASED` events (Phase 3's `POST
   /events`) for specific products, then kill the mock again → verify the
   fallback list is now ordered by purchase count rather than just
   "newest active product."
6. `GET /recommendations` with no `userId` → expect `400`.

## Exit Criteria

- `/recommendations` returns a valid, filtered, correctly-ordered product
  list when the mock is healthy.
- Killing the mock process still returns a sensible fallback list via
  `200`, never a `500` or hung request.
- The hardcoded invalid product ID injected by the mock never leaks into
  a response.
- `npm run build` compiles with no TypeScript errors.
