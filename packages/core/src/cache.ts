import { LRUCache } from "lru-cache";

export interface CacheOptions {
  max?: number;
  /** Time-to-live in milliseconds. */
  ttlMs: number;
}

/**
 * Thin LRU wrapper. Swap for Upstash in prod by implementing this interface.
 */
export class MemoryCache<K extends {}, V extends {}> {
  private cache: LRUCache<K, V>;

  constructor(opts: CacheOptions) {
    this.cache = new LRUCache<K, V>({
      max: opts.max ?? 5000,
      ttl: opts.ttlMs,
    });
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
