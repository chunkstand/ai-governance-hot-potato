import { LRUCache } from 'lru-cache';

/**
 * Request Cache - LRU cache for API response caching
 * 
 * Provides caching for read-only API endpoints with:
 * - 30 second TTL
 * - Max 200 entries
 * - Cache invalidation support
 */

// Cache configuration
const CACHE_TTL_MS = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 200;

// Singleton cache instance
let cache: LRUCache<string, { data: any; timestamp: number }> | null = null;

/**
 * Initialize or get the cache instance
 */
function getCache(): LRUCache<string, { data: any; timestamp: number }> {
  if (!cache) {
    cache = new LRUCache<string, { data: any; timestamp: number }>({
      max: MAX_CACHE_SIZE,
      ttl: CACHE_TTL_MS,
      allowStale: false,
      updateAgeOnGet: true,
    });
  }
  return cache;
}

/**
 * Generate cache key from endpoint and params
 */
export function generateCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  
  // Sort params for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${endpoint}:${JSON.stringify(sortedParams)}`;
}

/**
 * Get cached response if available and not expired
 */
export function getCachedResponse(key: string): { data: any; cached: boolean } | null {
  const entry = getCache().get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.timestamp;
  
  // Check if entry has expired (additional check beyond LRUCache TTL)
  if (age > CACHE_TTL_MS) {
    getCache().delete(key);
    return null;
  }
  
  return {
    data: entry.data,
    cached: true,
  };
}

/**
 * Set cached response
 */
export function setCachedResponse(key: string, data: any): void {
  getCache().set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache entries by prefix
 * Useful for list endpoints that need to be invalidated on writes
 */
export function invalidateCacheByPrefix(prefix: string): number {
  const cache = getCache();
  let invalidated = 0;
  
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      invalidated++;
    }
  }
  
  return invalidated;
}

/**
 * Invalidate specific cache key
 */
export function invalidateCacheKey(key: string): boolean {
  return getCache().delete(key);
}

/**
 * Invalidate all caches related to a specific session
 */
export function invalidateSessionCache(sessionId?: string): number {
  let invalidated = 0;
  
  if (sessionId) {
    // Invalidate specific session endpoints
    invalidated += invalidateCacheByPrefix(`/api/sessions/${sessionId}`);
    invalidated += invalidateCacheByPrefix(`/api/sessions?`); // List might include this session
  } else {
    // Invalidate all session caches
    invalidated += invalidateCacheByPrefix('/api/sessions');
  }
  
  return invalidated;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number; hitCount: number } {
  const cache = getCache();
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    hitCount: 0, // LRUCache doesn't expose hit count directly
  };
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  getCache().clear();
}
