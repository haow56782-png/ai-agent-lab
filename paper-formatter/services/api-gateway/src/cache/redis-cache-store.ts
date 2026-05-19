import type { CacheStore } from "./types.js";
import { redisGet, redisSetEx, redisDel, redisPing } from "../redis.js";

export class RedisCacheStore implements CacheStore {
  async get(key: string): Promise<string | null> {
    return redisGet(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await redisSetEx(key, ttlSeconds, value);
  }

  async del(key: string): Promise<void> {
    await redisDel(key);
  }

  /** Test Redis connectivity with a PING command. */
  async ping(): Promise<boolean> {
    return redisPing();
  }
}
