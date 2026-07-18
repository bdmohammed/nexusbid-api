import { logger } from '../../../config/logger';

interface CacheEntry {
  value: string | number | boolean | object | null | undefined;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

export async function getFromCache<T>(key: string): Promise<T | null> {
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  logger.debug({ key }, 'Cache hit');
  return entry.value as T;
}

export async function setToCache<T extends string | number | boolean | object | null | undefined>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryStore.set(key, { value, expiresAt });
  logger.debug({ key, ttlSeconds }, 'Cache set');
}

export async function invalidateCache(key: string): Promise<void> {
  memoryStore.delete(key);
  logger.debug({ key }, 'Cache invalidated');
}
