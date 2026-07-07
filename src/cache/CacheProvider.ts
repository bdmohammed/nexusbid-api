// src/cache/CacheProvider.ts

/**
 * Generic cache abstraction.
 *
 * Provides a uniform interface over any cache backend
 * (memory, Redis, Valkey, Memcached, etc.).
 *
 * All methods are async to accommodate remote backends.
 * Implementations MUST be safe to call concurrently.
 *
 * TTL is always in seconds.
 */
export interface CacheProvider {
    /**
     * Retrieve a cached value.
     * Returns null on cache miss or expiry.
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Store a value.
     *
     * @param key     Cache key.
     * @param value   Value to store. Must be JSON-serializable.
     * @param ttl     Time-to-live in seconds. Omit for no expiry.
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;

    /**
     * Remove a specific key.
     */
    delete(key: string): Promise<void>;

    /**
     * Remove multiple keys.
     */
    deleteMany(keys: string[]): Promise<void>;

    /**
     * Returns true if the key exists and has not expired.
     */
    has(key: string): Promise<boolean>;

    /**
     * Refresh TTL without changing the stored value.
     * No-ops if the key does not exist.
     */
    touch(key: string, ttl: number): Promise<void>;

    /**
     * Remove all cached entries.
     * Use with caution in production.
     */
    clear(): Promise<void>;

    /**
     * Returns all keys matching the given prefix.
     * Used for namespace-based invalidation.
     *
     * Warning: may be expensive on large caches.
     * Not recommended for hot paths.
     */
    keys(prefix?: string): Promise<string[]>;
}
