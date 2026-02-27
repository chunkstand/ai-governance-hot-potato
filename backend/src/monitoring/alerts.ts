/**
 * Alert Evaluation
 * 
 * Evaluates alerts based on configured thresholds:
 * - p95 latency > 2000ms
 * - error rate > 5% in 5 minutes
 * - AI daily cost >= $10
 * - WebSocket disconnect rate > 10%
 * - CPU > 80% or memory > 85%
 */

import os from 'os';
import { getRequestStats } from './requestStats';
import { getDailyTotal } from '../ai/cost/costTracker';
import { getHeartbeatMetrics } from '../socket/heartbeat';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  threshold: number;
  unit: string;
}

// Threshold configuration (can be overridden via config)
export interface AlertThresholds {
  p95LatencyMs: number;
  errorRatePercent: number;
  aiDailyCostUsd: number;
  websocketDisconnectRatePercent: number;
  cpuPercent: number;
  memoryPercent: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  p95LatencyMs: 2000,
  errorRatePercent: 5,
  aiDailyCostUsd: 10,
  websocketDisconnectRatePercent: 10,
  cpuPercent: 80,
  memoryPercent: 85,
};

let thresholds = { ...DEFAULT_THRESHOLDS };

/**
 * Set custom alert thresholds
 */
export function setAlertThresholds(custom: Partial<AlertThresholds>): void {
  thresholds = { ...thresholds, ...custom };
}

/**
 * Get current alert thresholds
 */
export function getAlertThresholds(): AlertThresholds {
  return { ...thresholds };
}

/**
 * Get CPU usage percentage
 */
function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      // @ts-expect-error - cpu.times has cpu, user, sys, idle, irq
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = ((total - idle) / total) * 100;
  
  return Math.round(usage * 100) / 100;
}

/**
 * Get memory usage percentage
 */
function getMemoryUsage(): number {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercent = (usedMemory / totalMemory) * 100;
  
  return Math.round(usagePercent * 100) / 100;
}

/**
 * Evaluate p95 latency alert
 */
function evaluateLatencyAlert(): Alert | null {
  const stats = getRequestStats();
  const p95Latency = stats.p95Latency;
  
  if (p95Latency > thresholds.p95LatencyMs) {
    return {
      id: 'high-latency',
      severity: 'warning',
      message: `p95 latency (${p95Latency}ms) exceeds threshold (${thresholds.p95LatencyMs}ms)`,
      currentValue: p95Latency,
      threshold: thresholds.p95LatencyMs,
      unit: 'ms',
    };
  }
  
  return null;
}

/**
 * Evaluate error rate alert
 */
function evaluateErrorRateAlert(): Alert | null {
  const stats = getRequestStats();
  const errorRate = stats.combinedErrorRate;
  
  if (errorRate > thresholds.errorRatePercent) {
    return {
      id: 'high-error-rate',
      severity: 'critical',
      message: `Combined error rate (${errorRate.toFixed(2)}%) exceeds threshold (${thresholds.errorRatePercent}%)`,
      currentValue: errorRate,
      threshold: thresholds.errorRatePercent,
      unit: '%',
    };
  }
  
  return null;
}

/**
 * Evaluate AI daily cost alert
 */
function evaluateAiCostAlert(): Alert | null {
  const dailyCost = getDailyTotal();
  
  if (dailyCost >= thresholds.aiDailyCostUsd) {
    return {
      id: 'ai-cost-threshold',
      severity: 'warning',
      message: `AI daily cost ($${dailyCost.toFixed(2)}) exceeds threshold ($${thresholds.aiDailyCostUsd})`,
      currentValue: dailyCost,
      threshold: thresholds.aiDailyCostUsd,
      unit: 'USD',
    };
  }
  
  return null;
}

/**
 * Evaluate WebSocket disconnect rate alert
 */
function evaluateWebSocketDisconnectAlert(): Alert | null {
  const metrics = getHeartbeatMetrics();
  
  // Calculate disconnect rate: disconnects / (active connections + disconnects)
  const totalConnections = metrics.totalConnections || 0;
  const staleDisconnects = metrics.staleDisconnections || 0;
  
  if (totalConnections === 0) return null;
  
  const disconnectRate = (staleDisconnects / Math.max(totalConnections, 1)) * 100;
  
  if (disconnectRate > thresholds.websocketDisconnectRatePercent) {
    return {
      id: 'high-disconnect-rate',
      severity: 'warning',
      message: `WebSocket disconnect rate (${disconnectRate.toFixed(2)}%) exceeds threshold (${thresholds.websocketDisconnectRatePercent}%)`,
      currentValue: disconnectRate,
      threshold: thresholds.websocketDisconnectRatePercent,
      unit: '%',
    };
  }
  
  return null;
}

/**
 * Evaluate CPU usage alert
 */
function evaluateCpuAlert(): Alert | null {
  const cpuUsage = getCpuUsage();
  
  if (cpuUsage > thresholds.cpuPercent) {
    return {
      id: 'high-cpu',
      severity: 'warning',
      message: `CPU usage (${cpuUsage.toFixed(1)}%) exceeds threshold (${thresholds.cpuPercent}%)`,
      currentValue: cpuUsage,
      threshold: thresholds.cpuPercent,
      unit: '%',
    };
  }
  
  return null;
}

/**
 * Evaluate memory usage alert
 */
function evaluateMemoryAlert(): Alert | null {
  const memoryUsage = getMemoryUsage();
  
  if (memoryUsage > thresholds.memoryPercent) {
    return {
      id: 'high-memory',
      severity: 'warning',
      message: `Memory usage (${memoryUsage.toFixed(1)}%) exceeds threshold (${thresholds.memoryPercent}%)`,
      currentValue: memoryUsage,
      threshold: thresholds.memoryPercent,
      unit: '%',
    };
  }
  
  return null;
}

/**
 * Get all active alerts
 * Evaluates all alert conditions and returns list of triggered alerts
 */
export function getAlerts(): Alert[] {
  const alerts: Alert[] = [];
  
  const latencyAlert = evaluateLatencyAlert();
  if (latencyAlert) alerts.push(latencyAlert);
  
  const errorRateAlert = evaluateErrorRateAlert();
  if (errorRateAlert) alerts.push(errorRateAlert);
  
  const aiCostAlert = evaluateAiCostAlert();
  if (aiCostAlert) alerts.push(aiCostAlert);
  
  const wsDisconnectAlert = evaluateWebSocketDisconnectAlert();
  if (wsDisconnectAlert) alerts.push(wsDisconnectAlert);
  
  const cpuAlert = evaluateCpuAlert();
  if (cpuAlert) alerts.push(cpuAlert);
  
  const memoryAlert = evaluateMemoryAlert();
  if (memoryAlert) alerts.push(memoryAlert);
  
  return alerts;
}

/**
 * Log active alerts to console
 */
export function logActiveAlerts(): void {
  const alerts = getAlerts();
  
  if (alerts.length > 0) {
    console.warn(`⚠️ Active alerts (${alerts.length}):`);
    for (const alert of alerts) {
      console.warn(`  - [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
  }
}

/**
 * Start periodic alert logging (every 60 seconds)
 */
let alertInterval: NodeJS.Timeout | null = null;

export function startAlertLogging(intervalMs: number = 60000): void {
  if (alertInterval) {
    console.log('[Alerts] Alert logging already running');
    return;
  }
  
  console.log(`[Alerts] Starting alert logging (interval: ${intervalMs}ms)`);
  
  // Initial check
  logActiveAlerts();
  
  // Periodic check
  alertInterval = setInterval(() => {
    logActiveAlerts();
  }, intervalMs);
}

/**
 * Stop periodic alert logging
 */
export function stopAlertLogging(): void {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
    console.log('[Alerts] Alert logging stopped');
  }
}

/**
 * Get alert summary
 */
export function getAlertSummary(): {
  count: number;
  critical: number;
  warning: number;
  info: number;
} {
  const alerts = getAlerts();
  
  return {
    count: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };
}

export default {
  getAlerts,
  logActiveAlerts,
  startAlertLogging,
  stopAlertLogging,
  getAlertSummary,
  setAlertThresholds,
  getAlertThresholds,
};
