// src/cache/ValkeyCacheProvider.ts

/**
 * Valkey Cache Provider
 *
 * Valkey is an open-source Redis fork (Linux Foundation, 2024).
 * Its client API is wire-compatible with Redis, so this provider
 * simply re-exports the RedisCacheProvider under a semantic alias.
 *
 * Usage:
 *
 *   import Valkey from "iovalkey"; // or any ioredis-compatible client
 *   import { ValkeyCacheProvider } from "@/cache/ValkeyCacheProvider";
 *
 *   const client = new Valkey({ host: env.VALKEY_HOST });
 *   const cache  = new ValkeyCacheProvider(client);
 *
 * If Valkey adds APIs not in Redis in the future, extend this class.
 */
export {
    RedisCacheProvider as ValkeyCacheProvider,
} from "./RedisCacheProvider";

export type {
    RedisClient as ValkeyClient,
} from "./RedisCacheProvider";
