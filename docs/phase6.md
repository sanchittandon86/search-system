# Phase 6 — Caching (Optional)

## Goal

Add Redis for exactly the two read paths that benefit from it — hot
search queries and per-user recommendations — using the cache-aside
pattern. Demonstrate correct, limited usage, not caching reflexively.
Per `readme.txt` §15: introduce caching only where there's a clear,
repeated-read justification; never on the write path.

## Scope

**In scope:**
- Cache-aside for `GET /products/search` (short TTL, ~60s)
- Cache-aside for `GET /recommendations` (longer TTL, ~5 min — personalized
  recommendations don't need to be fresh on every page load)
- Redis unavailability must never break a request — bypass to the normal
  DB/black-box path and log a warning

**Explicitly NOT cached (and why):**
- Product/inventory writes (`POST`/`PATCH` endpoints) — correctness-
  sensitive; caching here risks serving stale stock/price data
- `GET /products/{productId}` — not identified as a hot path in this
  design; add only if evidence shows repeated reads on specific products
- `POST /events` — write path, never cached

## Why Redis Must Be a Soft Dependency

Per `readme.txt`'s failure table: *"Redis unavailable → continue using
database."* Concretely: the Redis client is configured with
`enableOfflineQueue: false` and a `retryStrategy` that gives up quickly,
so a command against a dead Redis fails fast (milliseconds) rather than
hanging. Every cache read/write is wrapped so a failure is caught, logged,
and treated as a cache miss — it never throws up into the request path.

## Cache Keys & TTLs

| Endpoint | Key | TTL | Rationale |
|---|---|---|---|
| `GET /products/search` | `search:<normalized query params>` | 60s | Popular queries (e.g. "shoes") repeat often; 60s keeps results reasonably fresh without hammering the black box/DB on every request |
| `GET /recommendations` | `recommendations:<userId>:<limit>` | 300s | Personalized results don't need to be recalculated on every page load within a session |

The search cache key is built from the already-parsed, defaulted
`SearchQuery` object (so `?limit=20` and omitting `limit` produce the
same key) — not the raw query string, which would fragment the cache
across equivalent requests.

## Flow (cache-aside)

```
GET /products/search (or /recommendations)
  → build cache key from normalized input
  → GET key from Redis
      - hit  → return cached JSON directly (skip black box + DB entirely)
      - miss → run the existing Phase 4/5 flow (black box → hydrate/filter
                → fallback as needed)
               → SET key in Redis with TTL (fire-and-forget; failure to
                 write the cache does not fail the request)
               → return the freshly computed result
  → any Redis error at GET or SET is caught, logged, and treated as a
    miss/no-op — request proceeds against the DB/black-box regardless
```

## Module Structure

```
src/cache/
  redisClient.ts   -- ioredis instance, offline-queue disabled, fast-fail retry strategy
  cache.ts         -- getCached<T>(key), setCached(key, value, ttlSeconds) —
                      both swallow Redis errors and log a warning
```

No new module directory for caching logic itself — `search.service.ts`
and `recommendation.service.ts` each wrap their existing orchestration
with a thin cache-aside check, rather than introducing a new "caching
module" layer.

## Testing Plan (manual, via curl + redis-cli)

1. Start the main app and both mocks (Phases 4/5) with Redis running.
2. `GET /products/search?q=comfortable` twice → use `redis-cli` to
   confirm a `search:...` key now exists; second request should be
   noticeably faster (served from cache, no black-box/DB round trip).
3. `GET /recommendations?userId=<user>` twice → confirm a
   `recommendations:<userId>:<limit>` key exists in Redis.
4. `redis-cli FLUSHALL`, then stop Redis entirely (`redis-cli SHUTDOWN
   NOSAVE` or kill the process) → re-run both GET requests → verify they
   still return `200` with correct results (bypassing the dead cache),
   not an error.
5. Restart Redis → verify caching resumes (keys reappear after the next
   request).
6. Deactivate a product that was part of a cached search result, re-query
   within the TTL window → confirm the (now slightly stale) cached result
   is still served — this is the accepted tradeoff of a 60s TTL, not a bug.

## Exit Criteria

- Repeated identical search/recommendation requests are measurably
  faster and verifiably hit Redis (via `redis-cli` key inspection).
- Redis being completely unavailable does not break either endpoint —
  requests transparently fall through to the uncached path.
- No caching was added to any write endpoint or to `GET /products/{id}`.
- `npm run build` compiles with no TypeScript errors.
