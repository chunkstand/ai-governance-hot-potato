/**
 * Load Test Script
 * 
 * Runs configurable load tests against API endpoints and measures latency metrics.
 * 
 * Usage:
 *   npm run perf:load
 *   
 * Environment variables:
 *   PERF_BASE_URL - Base URL (default: http://localhost:3000)
 *   PERF_ENDPOINTS - Comma-separated endpoints (default: /api/sessions)
 *   PERF_REQUESTS - Number of requests (default: 200)
 *   PERF_CONCURRENCY - Concurrent requests (default: 10)
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:3000';
const ENDPOINTS = (process.env.PERF_ENDPOINTS || '/api/sessions').split(',').map(e => e.trim());
const TOTAL_REQUESTS = parseInt(process.env.PERF_REQUESTS || '200', 10);
const CONCURRENCY = parseInt(process.env.PERF_CONCURRENCY || '10', 10);

// Report output path
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'perf-report.json');

interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
}

interface RequestResult {
  latency: number;
  statusCode: number;
  error?: string;
}

interface EndpointResult {
  endpoint: string;
  latencies: number[];
  errorCount: number;
  metrics: LatencyMetrics;
}

/**
 * Make an HTTP request and return latency
 */
function makeRequest(endpoint: string): Promise<RequestResult> {
  return new Promise((resolve) => {
    const urlObj = new URL(endpoint, BASE_URL);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const startTime = Date.now();

    const req = client.get(urlObj, (res) => {
      // Consume response body
      res.on('data', () => {});
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          latency,
          statusCode: res.statusCode || 0,
        });
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      resolve({
        latency,
        statusCode: 0,
        error: err.message,
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        latency: 30000,
        statusCode: 0,
        error: 'Request timeout',
      });
    });
  });
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, index)];
}

/**
 * Calculate latency metrics
 */
function calculateMetrics(latencies: number[]): LatencyMetrics {
  if (latencies.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Run load test for a single endpoint
 */
async function testEndpoint(endpoint: string, requests: number, concurrency: number): Promise<EndpointResult> {
  console.log(`\nTesting ${endpoint}...`);
  console.log(`  Requests: ${requests}, Concurrency: ${concurrency}`);

  const latencies: number[] = [];
  let errorCount = 0;
  let completed = 0;

  // Run requests in batches
  for (let i = 0; i < requests; i += concurrency) {
    const batchSize = Math.min(concurrency, requests - i);
    const batch: Promise<RequestResult>[] = [];

    for (let j = 0; j < batchSize; j++) {
      batch.push(makeRequest(endpoint));
    }

    const results = await Promise.all(batch);

    for (const result of results) {
      completed++;
      if (result.error || result.statusCode >= 400) {
        errorCount++;
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        } else {
          console.log(`    HTTP ${result.statusCode}`);
        }
      } else {
        latencies.push(result.latency);
      }
    }

    // Progress indicator
    process.stdout.write(`\r  Progress: ${completed}/${requests}`);
  }

  console.log(`\n  Completed: ${latencies.length} successful, ${errorCount} errors`);

  const metrics = calculateMetrics(latencies);

  return {
    endpoint,
    latencies,
    errorCount,
    metrics,
  };
}

/**
 * Main test runner
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Load Test - API Performance');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoints: ${ENDPOINTS.join(', ')}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log('='.repeat(60));

  // Ensure reports directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const results: EndpointResult[] = [];
  const startTime = Date.now();

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint, TOTAL_REQUESTS, CONCURRENCY);
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    const errorRate = ((result.errorCount / TOTAL_REQUESTS) * 100).toFixed(2);
    console.log(`\n${result.endpoint}:`);
    console.log(`  Min: ${result.metrics.min}ms`);
    console.log(`  Mean: ${result.metrics.mean}ms`);
    console.log(`  Max: ${result.metrics.max}ms`);
    console.log(`  p50: ${result.metrics.p50}ms`);
    console.log(`  p95: ${result.metrics.p95}ms`);
    console.log(`  p99: ${result.metrics.p99}ms`);
    console.log(`  Error Rate: ${errorRate}%`);
  }

  console.log(`\nTotal Duration: ${totalDuration}ms`);

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      endpoints: ENDPOINTS,
      totalRequests: TOTAL_REQUESTS,
      concurrency: CONCURRENCY,
    },
    results: results.map(r => ({
      endpoint: r.endpoint,
      metrics: r.metrics,
      errorCount: r.errorCount,
      errorRate: (r.errorCount / TOTAL_REQUESTS) * 100,
    })),
    totalDuration,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${REPORT_FILE}`);
}

main().catch(console.error);
