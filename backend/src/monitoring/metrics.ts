import promClient from 'prom-client';
import { AIProvider } from '../ai/cost/costTypes';

// Create a Registry - get the default one for custom metrics
const register = promClient.register;

// AI Cost Counter - total cost in USD by provider
export const aiCostCounter = new promClient.Counter({
  name: 'ai_api_cost_usd_total',
  help: 'Total API cost in USD by provider',
  labelNames: ['provider'],
  registers: [register],
});

// AI Cost Daily Gauge - current daily total
export const aiCostDailyGauge = new promClient.Gauge({
  name: 'ai_api_cost_daily_usd',
  help: 'Current daily AI API cost in USD',
  labelNames: ['date'],
  registers: [register],
});

// Track daily totals in memory (for updating gauge)
const dailyCostTotals = new Map<string, number>();

// WebSocket Active Connections Gauge
export const webSocketConnectionsGauge = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections by namespace',
  labelNames: ['namespace'],
  registers: [register],
});

// WebSocket Disconnects Counter
export const webSocketDisconnectsCounter = new promClient.Counter({
  name: 'websocket_disconnects_total',
  help: 'Total WebSocket disconnects by namespace and reason',
  labelNames: ['namespace', 'reason'],
  registers: [register],
});

/**
 * Record an AI API cost
 * Increments the total cost counter and updates the daily gauge
 * @param provider - The AI provider (openai, anthropic)
 * @param costUsd - The cost in USD
 */
export function recordAiCost(provider: AIProvider, costUsd: number): void {
  // Increment the counter for this provider
  aiCostCounter.inc({ provider }, costUsd);
  
  // Update daily gauge
  const today = new Date().toISOString().slice(0, 10);
  const currentDaily = dailyCostTotals.get(today) ?? 0;
  const newDaily = currentDaily + costUsd;
  dailyCostTotals.set(today, newDaily);
  aiCostDailyGauge.set({ date: today }, newDaily);
}

/**
 * Set the number of active WebSocket connections for a namespace
 * @param namespace - The Socket.io namespace (game, spectator)
 * @param count - Number of active connections
 */
export function setWebSocketConnections(namespace: string, count: number): void {
  webSocketConnectionsGauge.set({ namespace }, count);
}

/**
 * Record a WebSocket disconnection
 * @param namespace - The Socket.io namespace (game, spectator)
 * @param reason - The reason for disconnection
 */
export function recordWebSocketDisconnect(namespace: string, reason: string): void {
  // Map unknown reasons to "other" for low-cardinality
  const normalizedReason = mapDisconnectReason(reason);
  webSocketDisconnectsCounter.inc({ namespace, reason: normalizedReason });
}

/**
 * Map disconnect reasons to low-cardinality set
 * @param reason - Raw disconnect reason from Socket.io
 * @returns Normalized reason string
 */
function mapDisconnectReason(reason: string): string {
  // Known good reasons
  const knownReasons = ['ping timeout', 'server disconnect', 'client disconnect', 'transport close', 'transport error'];
  
  if (knownReasons.includes(reason)) {
    return reason;
  }
  
  // Map unknown reasons to "other"
  return 'other';
}

export default {
  recordAiCost,
  setWebSocketConnections,
  recordWebSocketDisconnect,
  aiCostCounter,
  aiCostDailyGauge,
  webSocketConnectionsGauge,
  webSocketDisconnectsCounter,
};
