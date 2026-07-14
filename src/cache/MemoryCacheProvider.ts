// src/cache/MemoryCacheProvider.ts

import type { CacheProvider } from "./CacheProvider";

interface CacheEntry<T> {
    value: T;
    expiresAt: number | null; // null = no expiry
}

/**
 * In-memory cache provider backed by a `Map`.
 *
 * Suitable for:
 * - Single-process development environments
 * - Unit testing (fast, no external dependencies)
 * - Short-lived Lambda / serverless functions
 *
 * NOT suitable for multi-process or multi-server deployments.
 * Use RedisCacheProvider or ValkeyCacheProvider in production.
 *
 * TTL precision: millisecond-level (checked on read).
 * Expired entries are evicted lazily on access or via `cleanup()`.
 */
export class MemoryCacheProvider implements CacheProvider {
    private readonly store = new Map<string, CacheEntry<unknown>>();

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key);

        if (!entry) {
            return null;
        }

        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key);

            return null;
        }

        return entry.value as T;
    }

    async set<T>(
        key: string,
        value: T,
        ttl?: number,
    ): Promise<void> {
        this.store.set(key, {
            value,
            expiresAt:
                ttl !== undefined && ttl > 0
                    ? Date.now() + ttl * 1000
                    : null,
        });
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async deleteMany(keys: string[]): Promise<void> {
        for (const key of keys) {
            this.store.delete(key);
        }
    }

    async has(key: string): Promise<boolean> {
        return (await this.get(key)) !== null;
    }

    async touch(key: string, ttl: number): Promise<void> {
        const entry = this.store.get(key);

        if (!entry) {
            return;
        }

        entry.expiresAt = Date.now() + ttl * 1000;
    }

    async clear(): Promise<void> {
        this.store.clear();
    }

    async keys(prefix?: string): Promise<string[]> {
        const now = Date.now();
        const result: string[] = [];

        for (const [key, entry] of this.store) {
            if (entry.expiresAt !== null && now >= entry.expiresAt) {
                continue;
            }

            if (prefix === undefined || key.startsWith(prefix)) {
                result.push(key);
            }
        }

        return result;
    }

    /**
     * Remove all expired entries.
     *
     * Optional — call periodically to reclaim memory.
     * The store self-heals lazily during reads, so this is not required.
     */
    cleanup(): void {
        const now = Date.now();

        for (const [key, entry] of this.store) {
            if (entry.expiresAt !== null && now >= entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Returns the number of entries in the store (including expired).
     */
    size(): number {
        return this.store.size;
    }
}
