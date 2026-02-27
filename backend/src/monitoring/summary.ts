/**
 * Monitoring Summary
 * 
 * Composes monitoring data from multiple sources:
 * - HTTP: p95/p99 latency, 4xx/5xx rates from requestStats
 * - WebSocket: active connections, disconnect rate from heartbeat
 * - AI: daily cost from costTracker
 * - System: CPU, memory, uptime
 * - Alerts: getAlerts() output
 */

import os from 'os';
import { getRequestStats } from './requestStats';
import { getAlerts, getAlertThresholds } from './alerts';
import { getDailyTotal } from '../ai/cost/costTracker';
import { getHeartbeatMetrics } from '../socket/heartbeat';

export interface MonitoringSummary {
  timestamp: string;
  http: {
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalRequests: number;
    error4xxCount: number;
    error5xxCount: number;
    error4xxRate: number;
    error5xxRate: number;
    combinedErrorRate: number;
  };
  websocket: {
    activeConnections: number;
    totalConnections: number;
    staleDisconnections: number;
    disconnectRate: number;
  };
  ai: {
    dailyCostUsd: number;
    thresholds: {
      alertAtUsd: number;
    };
  };
  system: {
    cpuPercent: number;
    memoryPercent: number;
    uptimeSeconds: number;
    platform: string;
    nodeVersion: string;
  };
  alerts: {
    count: number;
    items: Array<{
      id: string;
      severity: string;
      message: string;
      currentValue: number;
      threshold: number;
      unit: string;
    }>;
  };
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
 * Build monitoring summary
 * Composes data from all monitoring sources
 */
export function buildMonitoringSummary(): MonitoringSummary {
  // HTTP stats from requestStats middleware
  const httpStats = getRequestStats();
  
  // WebSocket stats from heartbeat
  const wsMetrics = getHeartbeatMetrics();
  const totalWs = wsMetrics.totalConnections || 0;
  const staleDisconnects = wsMetrics.staleDisconnections || 0;
  const wsDisconnectRate = totalWs > 0 ? (staleDisconnects / Math.max(totalWs, 1)) * 100 : 0;
  
  // AI cost from costTracker
  const aiDailyCost = getDailyTotal();
  const alertThresholds = getAlertThresholds();
  
  // System metrics
  const cpuUsage = getCpuUsage();
  const memoryUsage = getMemoryUsage();
  
  // Alerts
  const alerts = getAlerts();
  
  return {
    timestamp: new Date().toISOString(),
    http: {
      p95LatencyMs: httpStats.p95Latency,
      p99LatencyMs: httpStats.p99Latency,
      totalRequests: httpStats.totalRequests,
      error4xxCount: httpStats.error4xxCount,
      error5xxCount: httpStats.error5xxCount,
      error4xxRate: Math.round(httpStats.error4xxRate * 100) / 100,
      error5xxRate: Math.round(httpStats.error5xxRate * 100) / 100,
      combinedErrorRate: Math.round(httpStats.combinedErrorRate * 100) / 100,
    },
    websocket: {
      activeConnections: wsMetrics.activeConnections,
      totalConnections: totalWs,
      staleDisconnections: staleDisconnects,
      disconnectRate: Math.round(wsDisconnectRate * 100) / 100,
    },
    ai: {
      dailyCostUsd: Math.round(aiDailyCost * 100) / 100,
      thresholds: {
        alertAtUsd: alertThresholds.aiDailyCostUsd,
      },
    },
    system: {
      cpuPercent: cpuUsage,
      memoryPercent: memoryUsage,
      uptimeSeconds: Math.floor(process.uptime()),
      platform: os.platform(),
      nodeVersion: process.version,
    },
    alerts: {
      count: alerts.length,
      items: alerts.map(alert => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        unit: alert.unit,
      })),
    },
  };
}

export default {
  buildMonitoringSummary,
};
