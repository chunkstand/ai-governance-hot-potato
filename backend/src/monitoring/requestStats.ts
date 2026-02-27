/**
 * Request Statistics Middleware
 * 
 * Tracks per-request duration and status codes in a 5-minute rolling window.
 * Exposes helpers to compute p95/p99 latency and error rates.
 */

import { Request, Response, NextFunction } from 'express';

// Bucket structure: minute -> { durations: number[], statusCodes: number[] }
type MinuteBucket = {
  durations: number[];
  statusCodes: number[];
};

const WINDOW_SIZE_MS = 5 * 60 * 1000; // 5 minutes
const BUCKET_SIZE_MS = 60 * 1000; // 1 minute buckets

// Ring buffer for the last 5 minutes (5 buckets)
const buckets: Map<number, MinuteBucket> = new Map();

// Current bucket timestamp
let currentBucketKey = Math.floor(Date.now() / BUCKET_SIZE_MS);

/**
 * Get the bucket key for a given timestamp
 */
function getBucketKey(timestamp: number): number {
  return Math.floor(timestamp / BUCKET_SIZE_MS);
}

/**
 * Get or create a bucket for the current time
 */
function getCurrentBucket(): MinuteBucket {
  const now = Date.now();
  const bucketKey = getBucketKey(now);
  
  if (bucketKey !== currentBucketKey) {
    // Clean up old buckets
    cleanupOldBuckets(bucketKey);
    currentBucketKey = bucketKey;
  }
  
  if (!buckets.has(bucketKey)) {
    buckets.set(bucketKey, { durations: [], statusCodes: [] });
  }
  
  return buckets.get(bucketKey)!;
}

/**
 * Remove buckets older than 5 minutes
 */
function cleanupOldBuckets(_currentKey: number): void {
  const cutoffKey = getBucketKey(Date.now() - WINDOW_SIZE_MS);
  
  for (const key of buckets.keys()) {
    if (key < cutoffKey) {
      buckets.delete(key);
    }
  }
}

/**
 * Get all samples from the rolling window
 */
function getWindowSamples(): { durations: number[]; statusCodes: number[] } {
  const now = Date.now();
  const cutoffKey = getBucketKey(now - WINDOW_SIZE_MS);
  
  const allDurations: number[] = [];
  const allStatusCodes: number[] = [];
  
  for (const [key, bucket] of buckets.entries()) {
    if (key > cutoffKey) {
      allDurations.push(...bucket.durations);
      allStatusCodes.push(...bucket.statusCodes);
    }
  }
  
  return { durations: allDurations, statusCodes: allStatusCodes };
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Express middleware to track request metrics
 */
export function requestStatsMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Capture original end to track response
  const originalEnd = res.end;
  
  // Override res.end to capture metrics
  (res as unknown as { end: (chunk?: unknown, encoding?: unknown) => void }).end = function(
    chunk?: unknown,
    encoding?: unknown
  ): void {
    // Record metrics after response
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const bucket = getCurrentBucket();
    
    bucket.durations.push(duration);
    bucket.statusCodes.push(status);
    
    // Call original end
    originalEnd.call(res, chunk as Buffer | string, encoding as BufferEncoding);
  };
  
  next();
}

/**
 * Get request statistics for the rolling window
 */
export function getRequestStats(): {
  p95Latency: number;
  p99Latency: number;
  totalRequests: number;
  error4xxCount: number;
  error5xxCount: number;
  error4xxRate: number;
  error5xxRate: number;
  combinedErrorRate: number;
} {
  const { durations, statusCodes } = getWindowSamples();
  
  if (durations.length === 0) {
    return {
      p95Latency: 0,
      p99Latency: 0,
      totalRequests: 0,
      error4xxCount: 0,
      error5xxCount: 0,
      error4xxRate: 0,
      error5xxRate: 0,
      combinedErrorRate: 0,
    };
  }
  
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p95Latency = calculatePercentile(sortedDurations, 95);
  const p99Latency = calculatePercentile(sortedDurations, 99);
  
  const totalRequests = statusCodes.length;
  const error4xxCount = statusCodes.filter(s => s >= 400 && s < 500).length;
  const error5xxCount = statusCodes.filter(s => s >= 500).length;
  
  const error4xxRate = (error4xxCount / totalRequests) * 100;
  const error5xxRate = (error5xxCount / totalRequests) * 100;
  const combinedErrorRate = ((error4xxCount + error5xxCount) / totalRequests) * 100;
  
  return {
    p95Latency,
    p99Latency,
    totalRequests,
    error4xxCount,
    error5xxCount,
    error4xxRate,
    error5xxRate,
    combinedErrorRate,
  };
}

/**
 * Get current bucket key (for testing)
 */
export function getCurrentBucketKey(): number {
  return currentBucketKey;
}

/**
 * Get number of active buckets (for testing)
 */
export function getBucketCount(): number {
  return buckets.size;
}

/**
 * Reset all stats (for testing)
 */
export function resetRequestStats(): void {
  buckets.clear();
  currentBucketKey = Math.floor(Date.now() / BUCKET_SIZE_MS);
}

export default {
  requestStatsMiddleware,
  getRequestStats,
  resetRequestStats,
};
