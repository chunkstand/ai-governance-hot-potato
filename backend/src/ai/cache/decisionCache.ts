import { LRUCache } from 'lru-cache';
import { DecisionOutput } from '../types/decision';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;

export interface DecisionCacheEntry {
  decision: DecisionOutput;
  provider: 'openai' | 'anthropic';
}

const decisionCache = new LRUCache<string, DecisionCacheEntry>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS
});

export function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, ' ').trim();
}

export function createDecisionCacheKey(params: {
  prompt: string;
  model: string;
  promptVersion: string;
  agentId: string;
  gameId: string;
}): string {
  const normalizedPrompt = normalizePrompt(params.prompt);
  return [
    params.model,
    params.promptVersion,
    params.agentId,
    params.gameId,
    normalizedPrompt
  ].join('::');
}

export function getCachedDecision(key: string): DecisionCacheEntry | undefined {
  return decisionCache.get(key);
}

export function setCachedDecision(key: string, entry: DecisionCacheEntry): void {
  decisionCache.set(key, entry);
}
