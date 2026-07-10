import { logger } from '../config/logger';

// Custom zero-dependency LRU Cache to maintain bounded memory usage
class LRUCache<K, V> {
  private max: number;
  private cache: Map<K, V>;

  constructor(max = 1000) {
    this.max = max;
    this.cache = new Map();
  }

  public get(key: K): V | undefined {
    const cachedEntry = this.cache.get(key);
    if (cachedEntry !== undefined) {
      // Refresh key order on hit
      this.cache.delete(key);
      this.cache.set(key, cachedEntry);
    }
    return cachedEntry;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict oldest (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  public delete(key: K): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}

// Bounded L1 in-process memory cache
const l1Cache = new LRUCache<string, { data: any; expiresAt: number }>(1000);

// Initialize optional L2 Redis client dynamically
let redisClient: any = null;

try {
  // Try importing ioredis. If not installed, we fallback to memory-only
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    redisClient.on('error', (error: any) => {
      logger.warn({ err: error }, 'Redis connection error. Falling back to memory cache.');
    });
  }
} catch (error) {
  logger.info('ioredis package not found or environment not configured. Cache fallback enabled.');
}

export class CacheService {
  /**
   * Retrieves item from L1 (Memory) cache first, then L2 (Redis) cache.
   * If cache misses, returns null so caller can query the DB.
   */
  public static async get<T>(key: string): Promise<T | null> {
    // Check L1 Cache
    const l1Item = l1Cache.get(key);
    if (l1Item) {
      if (l1Item.expiresAt > Date.now()) {
        return l1Item.data as T;
      }
      // Expired L1 item
      l1Cache.delete(key);
    }

    // Check L2 Cache (Redis)
    if (redisClient) {
      try {
        const cachedJsonString = await redisClient.get(key);
        if (cachedJsonString) {
          const parsedCacheData = JSON.parse(cachedJsonString);
          // Sync back to L1 cache
          l1Cache.set(key, { data: parsedCacheData, expiresAt: Date.now() + 60 * 1000 }); // 1 min memory TTL
          return parsedCacheData as T;
        }
      } catch (error) {
        logger.error({ err: error, key }, 'Failed to fetch key from Redis');
      }
    }

    return null;
  }

  /**
   * Cache a value in L1 memory and L2 Redis.
   */
  public static async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    
    // Set L1
    l1Cache.set(key, { data: value, expiresAt });

    // Set L2
    if (redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (error) {
        logger.error({ err: error, key }, 'Failed to set key in Redis');
      }
    }
  }

  /**
   * Invalidates a key across both memory cache and Redis.
   */
  public static async invalidate(key: string): Promise<void> {
    // Delete from L1
    l1Cache.delete(key);

    // Delete from L2
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        logger.error({ err: error, key }, 'Failed to delete key from Redis');
      }
    }
  }

  /**
   * Background invalidation helper to avoid blocking main thread.
   */
  public static invalidateBackground(key: string): void {
    setImmediate(async () => {
      try {
        await this.invalidate(key);
      } catch (error) {
        logger.error({ err: error, key }, 'Background cache invalidation failed');
      }
    });
  }
}
