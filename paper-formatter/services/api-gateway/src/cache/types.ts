export interface CacheStore {
  /** Returns cached value or null on miss. Never throws. */
  get(key: string): Promise<string | null>;

  /** Writes a value with TTL (seconds). Never throws. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;

  /** Deletes a key. Never throws. */
  del(key: string): Promise<void>;
}
