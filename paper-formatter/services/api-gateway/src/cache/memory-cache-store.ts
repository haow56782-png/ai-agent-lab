import type { CacheStore } from "./types.js";

interface Entry {
  value: string;
  expiresAt: number;
}

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, Entry>();
  private defaultTtlMs = 5 * 60_000; // 5 min

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttlMs = (ttlSeconds ?? 300) * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}
