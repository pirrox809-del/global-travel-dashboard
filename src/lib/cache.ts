/**
 * ttl-cache.ts — Lightweight in-memory TTL + LRU cache.
 *
 * ---------------------------------------------------------------------
 * Architectural note (why not Redis here?):
 * ---------------------------------------------------------------------
 * The sandbox runs on a single Next.js process with SQLite, so a
 * process-local Map is sufficient and zero-dependency. The API surface
 * below intentionally mirrors a Redis client (get/set/del/withTtl) so that
 * swapping to Redis in production is a 1-file change: replace the body of
 * each method with `await redis.get(key)` etc. The caller code (aggregator)
 * stays identical.
 *
 * Strategy:
 *  - Every entry stores its expiry timestamp. Reads lazy-delete expired entries.
 *  - A background sweep every 60s purges expired keys to bound memory.
 *  - LRU eviction kicks in when `maxEntries` is exceeded (default 2000).
 *  - Stats (hits/misses) are exposed for observability.
 */
type CacheEntry<T> = {
  value: T;
  expiresAt: number; // epoch ms; Infinity = no expiry
  lastAccess: number; // for LRU eviction
};

export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;
  private sweeper: ReturnType<typeof setInterval> | null = null;
  // Observability counters
  private hits = 0;
  private misses = 0;

  constructor(opts: { maxEntries?: number; sweepIntervalMs?: number } = {}) {
    this.maxEntries = opts.maxEntries ?? 2000;
    const sweepEvery = opts.sweepIntervalMs ?? 60_000;
    // Only schedule in long-running server contexts
    if (sweepEvery > 0 && typeof setInterval !== 'undefined') {
      this.sweeper = setInterval(() => this.sweep(), sweepEvery);
      // Don't keep the Node process alive just for the sweeper.
      if (this.sweeper && typeof this.sweeper.unref === 'function') {
        this.sweeper.unref();
      }
    }
  }

  /** Read a value, or undefined if missing/expired. Updates LRU recency. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    entry.lastAccess = Date.now();
    // Re-insert at end to mark as most-recently-used (Map preserves insertion order).
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  /** Write a value with a TTL in seconds (pass Infinity for no expiry). */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxEntries) {
      this.evictLru();
    }
    const expiresAt =
      ttlSeconds === Infinity ? Number.POSITIVE_INFINITY : Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt, lastAccess: Date.now() });
  }

  /** Convenience: run `fn` and cache its result under `key` for `ttlSeconds`. */
  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await fn();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  /** Clear keys matching a prefix. Useful for invalidation by domain. */
  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  size(): number {
    return this.store.size;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
      maxEntries: this.maxEntries,
    };
  }

  /** Remove expired entries proactively. */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== Number.POSITIVE_INFINITY && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Evict the least-recently-used entry (first key in insertion order). */
  private evictLru(): void {
    const oldest = this.store.keys().next();
    if (!oldest.done) {
      this.store.delete(oldest.value as string);
    }
  }

  dispose(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.store.clear();
  }
}

/**
 * Single shared instance for the whole app.
 * In production you'd replace this with a Redis client — the call sites
 * (`cache.wrap`, `cache.get`) wouldn't change.
 */
export const cache = new TtlCache({ maxEntries: 5000, sweepIntervalMs: 60_000 });

/**
 * Centralised TTL constants (seconds).
 * Tuned per data volatility:
 *  - countryList  : 24h  (country list never changes within a day)
 *  - countryMeta  : 7d   (capital/coords/flag basically immutable)
 *  - weather      : 20m  (current conditions, refresh ~3x/hour)
 *  - weatherForecast : 2h
 *  - exchangeRate : 6h   (ECB updates daily; cache long to be safe)
 *  - advisory     : 12h  (US State Dept updates a few times per week)
 *  - llmContent   : Infinity (persisted in DB instead — see llm-content.ts)
 */
export const TTL = {
  countryList: 60 * 60 * 24,
  countryMeta: 60 * 60 * 24 * 7,
  weather: 60 * 20,
  weatherForecast: 60 * 60 * 2,
  exchangeRate: 60 * 60 * 6,
  advisory: 60 * 60 * 12,
  i18n: 60 * 60 * 24 * 30, // 30 days — translations don't change often
} as const;
