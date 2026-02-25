export type AIProvider = 'openai' | 'anthropic';

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface UsageRecord extends ProviderUsage {
  provider: AIProvider;
  gameId: string;
  costUsd: number;
  recordedAt: string;
}

export interface CostSummary {
  dailyTotalUsd: number;
  gameTotalUsd: number;
  dailyAlertTriggered: boolean;
  gameCapReached: boolean;
}
