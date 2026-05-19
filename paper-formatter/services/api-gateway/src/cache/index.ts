import type { CacheStore } from "./types.js";
import { MemoryCacheStore } from "./memory-cache-store.js";
import { RedisCacheStore } from "./redis-cache-store.js";

// ── Singleton ──
let store: CacheStore = new MemoryCacheStore(); // safe default before init

/** Get the current cache store (safe to call any time). */
export function getCache(): CacheStore {
  return store;
}

/** Initialize the cache store. Must be called at startup. */
export async function initCacheStore(): Promise<{ store: CacheStore; mode: "redis" | "memory" }> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const redisStore = new RedisCacheStore();
    try {
      const pong = await redisStore.ping();
      if (pong) {
        console.log("[cache] Redis connected → RedisCacheStore");
        store = redisStore;
        return { store, mode: "redis" };
      }
    } catch {
      // Fall through to memory
    }
    console.warn("[cache] REDIS_URL set but Redis unreachable → MemoryCacheStore (cache miss is acceptable)");
  } else {
    console.log("[cache] REDIS_URL not set → MemoryCacheStore (cache miss is acceptable)");
  }

  store = new MemoryCacheStore();
  return { store, mode: "memory" };
}
