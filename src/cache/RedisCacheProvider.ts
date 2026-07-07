// src/cache/RedisCacheProvider.ts

import { CacheProvider } from "./CacheProvider";

/**
 * Minimal Redis client interface.
 *
 * Matches the API of `ioredis` and `@redis/client`.
 * Pass an instance of either library to `RedisCacheProvider`.
 *
 * This keeps the cache provider decoupled from a specific
 * Redis client library — swap freely without changing this file.
 */
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<unknown>;
    setex(key: string, seconds: number, value: string): Promise<unknown>;
    del(...keys: string[]): Promise<number>;
    exists(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    flushdb(): Promise<unknown>;
    keys(pattern: string): Promise<string[]>;
}

/**
 * Redis-backed cache provider.
 *
 * All values are JSON-serialized before storage.
 *
 * Setup:
 *
 *   import Redis from "ioredis";
 *   import { RedisCacheProvider } from "@/cache/RedisCacheProvider";
 *
 *   const redis = new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT });
 *   const cache = new RedisCacheProvider(redis);
 *
 * Suitable for production multi-process and multi-server deployments.
 */
export class RedisCacheProvider implements CacheProvider {
    constructor(private readonly client: RedisClient) {}

    async get<T>(key: string): Promise<T | null> {
        const raw = await this.client.get(key);

        if (raw === null) {
            return null;
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async set<T>(
        key: string,
        value: T,
        ttl?: number,
    ): Promise<void> {
        const serialized = JSON.stringify(value);

        if (ttl !== undefined && ttl > 0) {
            await this.client.setex(key, ttl, serialized);
        } else {
            await this.client.set(key, serialized);
        }
    }

    async delete(key: string): Promise<void> {
        await this.client.del(key);
    }

    async deleteMany(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return;
        }

        await this.client.del(...keys);
    }

    async has(key: string): Promise<boolean> {
        const count = await this.client.exists(key);

        return count > 0;
    }

    async touch(key: string, ttl: number): Promise<void> {
        await this.client.expire(key, ttl);
    }

    async clear(): Promise<void> {
        await this.client.flushdb();
    }

    async keys(prefix?: string): Promise<string[]> {
        const pattern = prefix ? `${prefix}*` : "*";

        return this.client.keys(pattern);
    }
}
