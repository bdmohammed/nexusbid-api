import { logger } from '../../../config/logger';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

export async function getFromCache(key: string): Promise<any | null> {
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  logger.debug({ key }, 'Cache hit');
  return entry.value;
}

export async function setToCache(key: string, value: any, ttlSeconds: number): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryStore.set(key, { value, expiresAt });
  logger.debug({ key, ttlSeconds }, 'Cache set');
}

export async function invalidateCache(key: string): Promise<void> {
  memoryStore.delete(key);
  logger.debug({ key }, 'Cache invalidated');
}
