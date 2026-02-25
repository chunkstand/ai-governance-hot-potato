import { config } from '../../config';
import { AIProvider, CostSummary, ProviderUsage, UsageRecord } from './costTypes';

const DEFAULT_DAILY_ALERT_USD = 10;
const DEFAULT_GAME_CAP_USD = 2;

const PROVIDER_RATES_PER_MILLION = {
  openai: { inputUsd: 0.15, outputUsd: 0.6 },
  anthropic: { inputUsd: 3, outputUsd: 15 }
} satisfies Record<AIProvider, { inputUsd: number; outputUsd: number }>;

const dailyTotals = new Map<string, number>();
const gameTotals = new Map<string, number>();
const usageLedger: UsageRecord[] = [];
const alertedDays = new Set<string>();

function getDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getDailyAlertThreshold(): number {
  return config.aiDailyCostAlertUsd ?? DEFAULT_DAILY_ALERT_USD;
}

function getGameCapThreshold(): number {
  return config.aiGameCostCapUsd ?? DEFAULT_GAME_CAP_USD;
}

function calculateCostUsd(provider: AIProvider, usage: ProviderUsage): number {
  const rates = PROVIDER_RATES_PER_MILLION[provider];
  const inputCost = (usage.inputTokens / 1_000_000) * rates.inputUsd;
  const outputCost = (usage.outputTokens / 1_000_000) * rates.outputUsd;
  return inputCost + outputCost;
}

function normalizeUsage(usage: Partial<ProviderUsage>): ProviderUsage {
  const inputTokens = Math.max(0, usage.inputTokens ?? 0);
  const outputTokens = Math.max(0, usage.outputTokens ?? 0);
  const totalTokens = Math.max(
    usage.totalTokens ?? inputTokens + outputTokens,
    inputTokens + outputTokens
  );

  return { inputTokens, outputTokens, totalTokens };
}

export function recordUsage(
  gameId: string,
  provider: AIProvider,
  usage: Partial<ProviderUsage>
): CostSummary {
  const normalizedUsage = normalizeUsage(usage);
  const costUsd = calculateCostUsd(provider, normalizedUsage);
  const dateKey = getDateKey();

  const dailyTotal = (dailyTotals.get(dateKey) ?? 0) + costUsd;
  const gameTotal = (gameTotals.get(gameId) ?? 0) + costUsd;

  dailyTotals.set(dateKey, dailyTotal);
  gameTotals.set(gameId, gameTotal);

  usageLedger.push({
    provider,
    gameId,
    costUsd,
    recordedAt: new Date().toISOString(),
    ...normalizedUsage
  });

  const dailyAlertThreshold = getDailyAlertThreshold();
  let dailyAlertTriggered = false;

  if (dailyTotal >= dailyAlertThreshold && !alertedDays.has(dateKey)) {
    alertedDays.add(dateKey);
    dailyAlertTriggered = true;
    console.warn(
      `⚠️ AI daily cost alert: $${dailyTotal.toFixed(2)} reached ` +
        `threshold of $${dailyAlertThreshold.toFixed(2)} (UTC ${dateKey}).`
    );
  }

  const gameCapReached = gameTotal >= getGameCapThreshold();

  return {
    dailyTotalUsd: dailyTotal,
    gameTotalUsd: gameTotal,
    dailyAlertTriggered,
    gameCapReached
  };
}

export function getDailyTotal(dateKey: string = getDateKey()): number {
  return dailyTotals.get(dateKey) ?? 0;
}

export function getGameTotal(gameId: string): number {
  return gameTotals.get(gameId) ?? 0;
}

export function shouldUseMinimalPrompt(gameId: string): boolean {
  return getGameTotal(gameId) >= getGameCapThreshold();
}

export function getUsageLedger(): UsageRecord[] {
  return [...usageLedger];
}
