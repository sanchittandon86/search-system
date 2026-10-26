import { BlackBoxCandidate } from "./recommendation.types";

async function attempt(url: string, userId: string, limit: number, timeoutMs: number): Promise<BlackBoxCandidate[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, limit }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`recommendation engine responded with ${response.status}`);
    }

    const data = (await response.json()) as { products: BlackBoxCandidate[] };
    return data.products;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the recommendation black box over HTTP with a short timeout and
 * exactly one retry. Any failure (timeout, network error, non-2xx) after
 * the retry is thrown to the caller, which is expected to fall back.
 */
export async function callRecommendationEngine(userId: string, limit: number): Promise<BlackBoxCandidate[]> {
  const url = process.env.RECOMMENDATION_ENGINE_URL ?? "http://localhost:4001/recommendation-engine/recommend";
  const timeoutMs = Number(process.env.RECOMMENDATION_TIMEOUT_MS) || 400;

  try {
    return await attempt(url, userId, limit, timeoutMs);
  } catch {
    return await attempt(url, userId, limit, timeoutMs);
  }
}
