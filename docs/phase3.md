# Phase 3 — Event Collection

## Goal

Start capturing user behavior so later phases (Recommendation, Phase 4)
have something to consume. This phase only needs to reliably and
idempotently persist events — it does **not** need recommendations to
exist yet, and it does **not** need Kafka (see `readme.txt` §11 for why).

## Scope

**In scope:**
- `POST /events` — validate, persist to `user_events`, return fast
- Idempotency via a client-supplied (or server-generated) `eventId`

**Out of scope (future phases):**
- Anything consuming these events (Phase 4 — Recommendation black box)
- Kafka / streaming (only if event volume genuinely demands it later)
- Event-triggered side effects (none in this design — events are purely
  write-and-forget from the API's perspective)

## Data Model (already created in `migrations/001_init.sql`)

```
user_events
  event_id      UUID PK            -- client-supplied or server-generated
  user_id       UUID FK -> users.user_id
  event_type    TEXT               -- enum, validated at the app layer
  product_id    UUID NULL          -- no FK; just an indexed reference
  search_query  TEXT NULL
  timestamp     TIMESTAMPTZ DEFAULT now()
  metadata      JSONB NULL
```

No `users` creation API exists in this design (out of scope, like sellers
were seeded directly in Phase 1) — test users are seeded directly via SQL.

## Endpoint

### `POST /events`

**Request body:**
```json
{
  "eventId": "optional-client-generated-uuid",
  "userId": "u123",
  "eventType": "PRODUCT_VIEWED",
  "productId": "p456",
  "searchQuery": null,
  "timestamp": "2026-10-26T12:00:00.000Z",
  "metadata": {}
}
```

**Response `202 Accepted`:**
```json
{ "eventId": "a1b2c3d4-...-uuid" }
```

**Supported `eventType` values** (enforced at the application layer, not
a DB enum type — keeps it simple to extend):
`PRODUCT_VIEWED`, `PRODUCT_CLICKED`, `SEARCH_PERFORMED`, `ADD_TO_CART`,
`REMOVE_FROM_CART`, `WISHLISTED`, `PURCHASED`

**Validation:**
- `userId` required; must be syntactically a UUID → else `400`
- `userId` must reference an existing row in `users` (DB foreign-key
  violation is caught and mapped to `400 user does not exist` — not a
  generic `500`)
- `eventType` required, must be one of the 7 values above → else `400`
- `eventId`, if provided by the client, is used as-is (this is the
  idempotency key). If omitted, the server generates one with
  `crypto.randomUUID()`
- `productId`, `searchQuery`, `metadata`, `timestamp` are all optional —
  no cross-referential validation on `productId` (the table has no FK to
  `products`, intentionally, so a later deleted/invalid product doesn't
  block event ingestion)

**Idempotency (duplicate `eventId`):**
```sql
INSERT INTO user_events (event_id, user_id, event_type, product_id, search_query, timestamp, metadata)
VALUES (...)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;
```
If the insert is a no-op (row already existed), the endpoint still
returns `202 { eventId }` — a duplicate POST is **not** an error, it's a
successful no-op. This is what makes client-side retries safe.

## Why This Must Never Block the User

Per `readme.txt` §11: the frontend fires `POST /events` fire-and-forget
after a view/click/cart action — a slow or failing event call must never
delay or fail the user's primary action. In this phase that's a frontend
discipline (don't `await` the event call before proceeding), not a backend
mechanism; the backend endpoint itself is a simple synchronous
validate-then-insert that should be fast (single indexed INSERT).

## Module Structure

```
src/modules/events/
  event.types.ts        -- EventType enum, request/response shapes
  event.repository.ts    -- INSERT ... ON CONFLICT DO NOTHING
  event.service.ts        -- validation (eventType enum, UUID shape)
  event.controller.ts      -- parses req.body, calls service
  event.routes.ts           -- POST /events
```

## Error Handling

| Scenario | Status | Body |
|---|---|---|
| Missing/invalid `userId` format | 400 | `{ "error": "userId must be a valid UUID" }` |
| `userId` does not exist (FK violation) | 400 | `{ "error": "user does not exist" }` |
| Missing/invalid `eventType` | 400 | `{ "error": "eventType must be one of ..." }` |
| Duplicate `eventId` | 202 | `{ "eventId": "..." }` (no-op, not an error) |
| Successful new event | 202 | `{ "eventId": "..." }` |

## Testing Plan (manual, via curl)

1. Seed a test user directly via SQL.
2. `POST /events` with `eventType: PRODUCT_VIEWED` and no `eventId` →
   verify `202` with a generated `eventId`, row exists in `user_events`.
3. Re-POST the exact same body including the returned `eventId` → verify
   `202` again and exactly one row still exists (no duplicate).
4. `POST /events` with an invalid `eventType` (e.g. `"FOO"`) → expect `400`.
5. `POST /events` with a `userId` that doesn't exist → expect `400 user
   does not exist`.
6. `POST /events` with a malformed (non-UUID) `userId` → expect `400`.
7. Fire one event of each of the 7 supported types → verify all 7 rows
   land correctly with the right `event_type` value.

## Exit Criteria

- Firing each of the 7 event types via a test script reliably creates
  rows.
- Firing the same `eventId` twice does not create a duplicate row and
  does not return an error.
- Invalid `eventType` and invalid/unknown `userId` are rejected with
  `400`, not `500`.
- `npm run build` compiles with no TypeScript errors.
