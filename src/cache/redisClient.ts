import Redis from "ioredis";

// Offline queue disabled + fast-fail retry strategy: a command against a
// dead Redis rejects in milliseconds instead of hanging or queueing
// indefinitely. Callers (cache.ts) always catch and treat failures as a
// cache miss — Redis must never be a hard dependency for a request.
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.warn("[redis] connection error:", err.message);
});

export default redis;
