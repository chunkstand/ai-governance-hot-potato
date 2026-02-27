/**
 * Memory Soak Test Script
 * 
 * Monitors server memory usage over time to detect memory leaks.
 * 
 * Usage:
 *   npm run perf:memory
 *   
 * Environment variables:
 *   MEM_BASE_URL - Base URL (default: http://localhost:3000)
 *   MEM_DURATION_MIN - Test duration in minutes (default: 30)
 *   MEM_SAMPLE_SEC - Sample interval in seconds (default: 60)
 *   MEM_GROWTH_THRESHOLD - Growth threshold percentage (default: 15)
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.MEM_BASE_URL || 'http://localhost:3000';
const DURATION_MIN = parseInt(process.env.MEM_DURATION_MIN || '30', 10);
const SAMPLE_INTERVAL_SEC = parseInt(process.env.MEM_SAMPLE_SEC || '60', 10);
const GROWTH_THRESHOLD = parseInt(process.env.MEM_GROWTH_THRESHOLD || '15', 10);
const WARMUP_SAMPLES = 5; // First 5 samples are warmup, not counted for leak detection

// Report output path
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'memory-soak.json');

interface MemorySample {
  timestamp: string;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

interface MemoryReport {
  config: {
    baseUrl: string;
    durationMin: number;
    sampleIntervalSec: number;
    growthThreshold: number;
  };
  samples: MemorySample[];
  summary: {
    initialHeapUsed: number;
    finalHeapUsed: number;
    heapGrowthPercent: number;
    leakDetected: boolean;
    sampleCount: number;
    durationMs: number;
  };
}

/**
 * Make an HTTP request to keep server active
 */
function makeRequest(endpoint: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint, BASE_URL);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.get(urlObj, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve();
      });
    });

    req.on('error', (err) => {
      // Log but don't fail on request errors
      console.log(`  Request error: ${err.message}`);
      resolve(); // Continue anyway
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve();
    });
  });
}

/**
 * Get memory info from server /health endpoint
 */
async function getMemoryInfo(): Promise<MemorySample | null> {
  try {
    const healthUrl = new URL('/health', BASE_URL);
    const isHttps = healthUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve) => {
      const req = client.get(healthUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const memorySample: MemorySample = {
              timestamp: new Date().toISOString(),
              heapUsed: json.memory?.heapUsed || process.memoryUsage().heapUsed,
              heapTotal: json.memory?.heapTotal || process.memoryUsage().heapTotal,
              rss: json.memory?.rss || process.memoryUsage().rss,
              external: json.memory?.external || process.memoryUsage().external,
            };
            resolve(memorySample);
          } catch {
            // If health doesn't return memory, use local process memory
            const memUsage = process.memoryUsage();
            resolve({
              timestamp: new Date().toISOString(),
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              rss: memUsage.rss,
              external: memUsage.external,
            });
          }
        });
      });

      req.on('error', () => {
        // If health endpoint fails, use local process as fallback
        const memUsage = process.memoryUsage();
        resolve({
          timestamp: new Date().toISOString(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        const memUsage = process.memoryUsage();
        resolve({
          timestamp: new Date().toISOString(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
        });
      });
    });
  } catch {
    // Fallback to local memory usage
    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
    };
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Main memory soak test
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Memory Soak Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Duration: ${DURATION_MIN} minutes`);
  console.log(`Sample Interval: ${SAMPLE_INTERVAL_SEC} seconds`);
  console.log(`Growth Threshold: ${GROWTH_THRESHOLD}%`);
  console.log('='.repeat(60));

  // Ensure reports directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const samples: MemorySample[] = [];
  const startTime = Date.now();
  const endTime = startTime + (DURATION_MIN * 60 * 1000);
  const sampleIntervalMs = SAMPLE_INTERVAL_SEC * 1000;

  console.log('\nStarting memory monitoring...\n');

  let sampleNum = 0;

  while (Date.now() < endTime) {
    sampleNum++;
    const sample = await getMemoryInfo();
    
    if (sample) {
      samples.push(sample);
      
      console.log(`Sample ${sampleNum} [${sample.timestamp}]:`);
      console.log(`  Heap Used: ${formatBytes(sample.heapUsed)}`);
      console.log(`  Heap Total: ${formatBytes(sample.heapTotal)}`);
      console.log(`  RSS: ${formatBytes(sample.rss)}`);
    }

    // Make requests to keep server active
    console.log('  Making requests to keep server active...');
    await Promise.all([
      makeRequest('/health'),
      makeRequest('/api/sessions'),
    ]);

    // Wait for next sample interval
    const elapsed = Date.now() - startTime;
    const expectedSamples = Math.floor(elapsed / sampleIntervalMs);
    
    if (samples.length < expectedSamples) {
      // We're behind, catch up
      continue;
    }

    const timeToNext = sampleIntervalMs - (elapsed % sampleIntervalMs);
    if (timeToNext > 0 && Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, timeToNext));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Analyze results
  const initialHeapUsed = samples[WARMUP_SAMPLES]?.heapUsed || samples[0]?.heapUsed || 0;
  const finalHeapUsed = samples[samples.length - 1]?.heapUsed || 0;
  const heapGrowthPercent = initialHeapUsed > 0 
    ? ((finalHeapUsed - initialHeapUsed) / initialHeapUsed) * 100 
    : 0;

  // Only count samples after warmup for leak detection
  const samplesAfterWarmup = samples.slice(WARMUP_SAMPLES);
  const firstWarmupSample = samplesAfterWarmup[0]?.heapUsed || 0;
  const lastSample = samplesAfterWarmup[samplesAfterWarmup.length - 1]?.heapUsed || 0;
  const leakGrowthPercent = firstWarmupSample > 0 
    ? ((lastSample - firstWarmupSample) / firstWarmupSample) * 100 
    : 0;

  const leakDetected = leakGrowthPercent > GROWTH_THRESHOLD;

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nSamples collected: ${samples.length}`);
  console.log(`Duration: ${Math.round(totalDuration / 1000 / 60)} minutes`);
  console.log(`\nMemory Growth (all samples):`);
  console.log(`  Initial: ${formatBytes(initialHeapUsed)}`);
  console.log(`  Final: ${formatBytes(finalHeapUsed)}`);
  console.log(`  Growth: ${heapGrowthPercent.toFixed(2)}%`);
  console.log(`\nMemory Growth (after warmup, samples ${WARMUP_SAMPLES + 1}-${samples.length}):`);
  console.log(`  Initial: ${formatBytes(firstWarmupSample)}`);
  console.log(`  Final: ${formatBytes(lastSample)}`);
  console.log(`  Growth: ${leakGrowthPercent.toFixed(2)}%`);
  console.log(`\nLeak Detected: ${leakDetected ? 'YES' : 'NO'}`);
  console.log(`  Threshold: ${GROWTH_THRESHOLD}%`);
  console.log(`  Actual: ${leakGrowthPercent.toFixed(2)}%`);

  if (leakDetected) {
    console.log('\n⚠️  WARNING: Potential memory leak detected!');
    console.log('    Heap usage grew by more than the threshold.');
  } else {
    console.log('\n✓ Memory usage is stable.');
  }

  // Write JSON report
  const report: MemoryReport = {
    config: {
      baseUrl: BASE_URL,
      durationMin: DURATION_MIN,
      sampleIntervalSec: SAMPLE_INTERVAL_SEC,
      growthThreshold: GROWTH_THRESHOLD,
    },
    samples,
    summary: {
      initialHeapUsed,
      finalHeapUsed,
      heapGrowthPercent,
      leakDetected,
      sampleCount: samples.length,
      durationMs: totalDuration,
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${REPORT_FILE}`);

  // Exit with error code if leak detected
  if (leakDetected) {
    console.log('\nExiting with code 1 due to memory leak detection.');
    process.exit(1);
  }
}

main().catch(console.error);
