import redis from "./redisClient";

/**
 * Cache-aside helpers. Both swallow Redis errors and treat them as a
 * miss/no-op — caching is a soft dependency, never a hard one. See
 * docs/phase6.md for the failure-handling rationale.
 */

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[cache] GET ${key} failed:`, (err as Error).message);
    return null;
  }
}

export async function setCached(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.warn(`[cache] SET ${key} failed:`, (err as Error).message);
  }
}
