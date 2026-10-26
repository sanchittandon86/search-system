# Phase 7 — Hardening

## Goal

Make failure handling real and verifiable, not just described. Two
pieces are new in this phase: a circuit breaker around both black-box
clients, and an actual test suite (not just manual curl runs) for the
three scenarios the design calls out as needing proof: inventory
concurrency, event idempotency, and search fallback.

**Already done in earlier phases, not repeated here:**
- Explicit timeouts on both black-box calls (`SEARCH_ENGINE_TIMEOUT_MS`,
  `RECOMMENDATION_TIMEOUT_MS`, Phases 4/5)
- One retry per black-box call (Phases 4/5)
- Fallback paths for search (naive Postgres) and recommendations
  (trending), Phases 4/5
- Redis as a soft dependency (Phase 6)

## Scope

**In scope:**
- A small, reusable circuit breaker wrapped around both black-box
  clients
- A hand-rolled test suite (no test framework — see rationale below) for
  the three scenarios called out in the overall implementation plan

**Out of scope:**
- A general-purpose resilience library (opossum, etc.) — the breaker
  needed here is ~30 lines
- Exhaustive test coverage of every endpoint — this phase targets the
  three scenarios that are genuinely easy to get wrong silently

## Why No Test Framework

Node's built-in test runner (`node:test`) resolves test files through
its ESM loader even when given an explicit path, which conflicts with
this project's CommonJS + `ts-node/register` setup (`ERR_UNKNOWN_FILE_EXTENSION
".ts"`). Pulling in Jest/Vitest just to run three scenario checks would
add config surface disproportionate to what's being tested. Instead,
each test is a plain script: seed → exercise → assert with `node:assert`
→ clean up → exit 0, or let an uncaught `AssertionError` crash the
process with a non-zero exit code. `npm test` chains them with `&&`, so
the whole thing still fails loudly if any one of them does. This is
exactly as much test infrastructure as three scenario checks need.

Each test calls service/repository functions **directly** (in-process),
not over HTTP — there's no need for `supertest` or a running server. They
do need a real Postgres connection (same local DB as the rest of the
project); they seed their own rows with randomized data and clean up
after themselves in a `finally` block, so they don't depend on or
interfere with data from manual testing in earlier phases.

## Circuit Breaker

### Why

Without one, an extended black-box outage means every single request
still pays the full timeout + retry latency before falling back — for
400ms timeout × 2 attempts, that's up to 800ms of dead time per request,
every request, for as long as the outage lasts. A circuit breaker stops
that: after enough consecutive failures, skip the network call entirely
for a cooldown window and go straight to fallback.

### Design

```
src/resilience/circuitBreaker.ts

class CircuitBreaker {
  constructor(name: string, failureThreshold: number, cooldownMs: number)

  isOpen(): boolean       // true => skip the call, fail fast
  recordSuccess(): void   // resets the failure count, closes the circuit
  recordFailure(): void   // increments; opens the circuit at the threshold
}
```

- **Closed** (normal): calls go through as usual.
- **Open**: `isOpen()` returns `true` immediately — the client throws
  without attempting the HTTP call, so the caller's existing
  try/catch-and-fallback logic (unchanged from Phases 4/5) kicks in
  immediately instead of after a timeout.
- After `cooldownMs` elapses, the breaker allows a single trial call
  (transitions back to closed optimistically) — if it succeeds,
  `recordSuccess()` resets the failure count; if it fails, the circuit
  re-opens for another cooldown window.

One breaker instance per black box (`search.client.ts`,
`recommendation.client.ts`), each with its own failure count — a search
outage doesn't trip the recommendation breaker and vice versa. Defaults:
3 consecutive failures opens the circuit, 10s cooldown
(`CIRCUIT_BREAKER_FAILURE_THRESHOLD`, `CIRCUIT_BREAKER_COOLDOWN_MS`).

State transitions are logged (`console.warn`/`console.log`) so the
behavior is observable without instrumenting anything further.

## Test Suite

```
tests/
  inventory-concurrency.test.ts   -- two parallel adjustQuantity(-1) calls
                                      against quantity=1: exactly one
                                      succeeds, the other is rejected, and
                                      the DB never goes negative
  events-idempotency.test.ts       -- createEvent() called twice with the
                                       same client-supplied eventId:
                                       exactly one row ends up in user_events
  search-fallback.test.ts           -- SEARCH_ENGINE_URL pointed at an
                                        unreachable address for the
                                        duration of the call: search still
                                        returns the expected product via
                                        the naive Postgres fallback, not
                                        a thrown error
```

Run with `npm test` (chains all three; stops and reports on first
failure). None of these require the main app or either mock service to
be running — only Postgres.

## Exit Criteria

- `npm test` passes, exercising all three scenarios against a real
  Postgres connection (not mocked).
- Killing either mock process (manually, as in Phases 4/5) and sending
  several requests in a row visibly shows the circuit breaker opening in
  the logs after the failure threshold, and every subsequent request
  logs `circuit open, skipping network call` — proof the HTTP attempt is
  genuinely skipped, not just that the response still "happens" to come
  back quickly. (On localhost, a refused connection is already fast, so
  wall-clock timing alone isn't a reliable way to demonstrate the
  skip — the log line is.)
- `npm run build` compiles with no TypeScript errors.
