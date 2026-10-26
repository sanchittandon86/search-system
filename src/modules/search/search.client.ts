import { CircuitBreaker } from "../../resilience/circuitBreaker";

const breaker = new CircuitBreaker(
  "search-engine",
  Number(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) || 3,
  Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS) || 10000
);

export interface SearchEngineFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchEngineCandidate {
  productId: string;
  score: number;
}

export interface SearchEngineResult {
  products: SearchEngineCandidate[];
  total: number;
}

async function attempt(
  url: string,
  query: string | undefined,
  filters: SearchEngineFilters,
  limit: number,
  timeoutMs: number
): Promise<SearchEngineResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, filters, limit }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`search engine responded with ${response.status}`);
    }

    return (await response.json()) as SearchEngineResult;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the search black box over HTTP with a short timeout and exactly
 * one retry. Any failure (timeout, network error, non-2xx) after the
 * retry is thrown to the caller, which is expected to fall back to the
 * naive Postgres search.
 */
export async function callSearchEngine(
  query: string | undefined,
  filters: SearchEngineFilters,
  limit: number
): Promise<SearchEngineResult> {
  if (breaker.isOpen()) {
    console.warn("[circuit-breaker] search-engine: circuit open, skipping network call");
    throw new Error("search engine circuit breaker is open");
  }

  const url = process.env.SEARCH_ENGINE_URL ?? "http://localhost:4002/search-engine/search";
  const timeoutMs = Number(process.env.SEARCH_ENGINE_TIMEOUT_MS) || 400;

  try {
    const result = await attempt(url, query, filters, limit, timeoutMs);
    breaker.recordSuccess();
    return result;
  } catch {
    try {
      const result = await attempt(url, query, filters, limit, timeoutMs);
      breaker.recordSuccess();
      return result;
    } catch (err) {
      breaker.recordFailure();
      throw err;
    }
  }
}
