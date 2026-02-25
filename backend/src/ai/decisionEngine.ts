import {
  createDecisionCacheKey,
  getCachedDecision,
  setCachedDecision
} from './cache/decisionCache';
import { callOpenAIDecisionWithCircuit } from './circuit/openaiCircuit';
import { recordUsage, shouldUseMinimalPrompt } from './cost/costTracker';
import { buildDecisionPrompt, DecisionPromptMode, PROMPT_VERSION } from './prompts/decisionPrompt';
import { callAnthropicDecision } from './providers/anthropicClient';
import { enqueueDecision } from './queue/decisionQueue';
import { DecisionAlternative, DecisionInput, DecisionOutput } from './types/decision';
import { DecisionOutputValidationError } from './validation/decisionValidator';

export interface DecisionRequest {
  gameId: string;
  apiKey: string;
  input: DecisionInput;
  deterministic?: boolean;
}

export interface DecisionMetadata {
  fallbackUsed: boolean;
  failureCount: number;
  confidence: number;
  alternatives: DecisionAlternative[];
  reasoningSummary: string;
  rateLimitForgiven?: boolean;
  timeoutForfeit?: boolean;
  autoLoss?: boolean;
  minimalPromptUsed?: boolean;
}

export interface DecisionResult {
  provider: 'openai' | 'anthropic' | 'fallback';
  decision: DecisionOutput;
  metadata: DecisionMetadata;
}

type ProviderAttemptResult =
  | { ok: true; decision: DecisionOutput }
  | {
      ok: false;
      errorType: 'invalid_output' | 'timeout' | 'rate_limit' | 'provider_error';
      error: unknown;
    };

const CACHE_MODEL = 'gpt-4o-mini';
const MAX_FAILURES = 3;
const MIN_TIMEOUT_MS = 2500;
const MID_TIMEOUT_MS = 4500;
const MAX_TIMEOUT_MS = 8000;

const failureStateByGame = new Map<string, { failureCount: number; rateLimitCount: number }>();

function formatProviderError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getFailureState(gameId: string): { failureCount: number; rateLimitCount: number } {
  const existing = failureStateByGame.get(gameId);
  if (existing) {
    return existing;
  }

  const initial = { failureCount: 0, rateLimitCount: 0 };
  failureStateByGame.set(gameId, initial);
  return initial;
}

function incrementFailureCount(gameId: string): number {
  const state = getFailureState(gameId);
  state.failureCount += 1;
  return state.failureCount;
}

function incrementRateLimitCount(gameId: string): number {
  const state = getFailureState(gameId);
  state.rateLimitCount += 1;
  return state.rateLimitCount;
}

function isTimeoutError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout');
}

function isRateLimitError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests');
}

function buildFallbackDecision(reason: string): DecisionOutput {
  return {
    answer: 'A',
    reasoningSummary: reason,
    confidence: 0.05,
    alternatives: []
  };
}

function buildAutoLossDecision(): DecisionOutput {
  return {
    answer: 'A',
    reasoningSummary: 'Automatic loss due to repeated AI failures.',
    confidence: 0,
    alternatives: []
  };
}

function buildMetadata(
  decision: DecisionOutput,
  failureCount: number,
  overrides: Partial<DecisionMetadata> = {}
): DecisionMetadata {
  return {
    fallbackUsed: false,
    failureCount,
    confidence: decision.confidence,
    alternatives: decision.alternatives,
    reasoningSummary: decision.reasoningSummary,
    ...overrides
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getStateCandidates(state: Record<string, unknown>): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [state];
  const nestedKeys = ['game', 'gameState', 'state'];
  for (const key of nestedKeys) {
    const nested = state[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      candidates.push(nested as Record<string, unknown>);
    }
  }
  return candidates;
}

function getNumericStateValue(
  candidates: Record<string, unknown>[],
  keys: string[]
): number | null {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

function getStringStateValue(
  candidates: Record<string, unknown>[],
  keys: string[]
): string | null {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }
  return null;
}

function computeAdaptiveTimeoutMs(input: DecisionInput): number {
  const candidates = getStateCandidates(input.visibleGameState);
  const phaseHint = getStringStateValue(candidates, ['phase', 'gamePhase', 'turnPhase']);
  let baseTimeout = MID_TIMEOUT_MS;

  if (phaseHint) {
    const normalized = phaseHint.toLowerCase();
    if (normalized.includes('early')) {
      baseTimeout = MIN_TIMEOUT_MS;
    } else if (normalized.includes('late')) {
      baseTimeout = MAX_TIMEOUT_MS - 1000;
    }
  } else {
    const current = getNumericStateValue(candidates, [
      'turn',
      'turnNumber',
      'round',
      'roundNumber',
      'questionIndex'
    ]);
    const total = getNumericStateValue(candidates, [
      'totalTurns',
      'maxTurns',
      'totalRounds',
      'questionTotal'
    ]);

    if (current !== null && total !== null && total > 0) {
      const ratio = current / total;
      if (ratio < 0.34) {
        baseTimeout = MIN_TIMEOUT_MS;
      } else if (ratio < 0.67) {
        baseTimeout = MID_TIMEOUT_MS;
      } else {
        baseTimeout = MAX_TIMEOUT_MS - 1000;
      }
    }
  }

  const complexityScore = JSON.stringify(input.visibleGameState).length;
  let complexityBonus = 0;
  if (complexityScore > 8000) {
    complexityBonus = 2000;
  } else if (complexityScore > 4000) {
    complexityBonus = 1000;
  }

  return clamp(baseTimeout + complexityBonus, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
}

export async function generateDecision(request: DecisionRequest): Promise<DecisionResult> {
  const { gameId, apiKey, input } = request;
  const deterministic = request.deterministic ?? true;
  const promptMode: DecisionPromptMode = shouldUseMinimalPrompt(gameId) ? 'minimal' : 'full';
  const minimalPromptUsed = promptMode === 'minimal';

  const cacheKey = deterministic
    ? createDecisionCacheKey({
        prompt: buildDecisionPrompt(input, { mode: promptMode }),
        model: CACHE_MODEL,
        promptVersion: input.promptVersion || PROMPT_VERSION,
        agentId: input.agent.id,
        gameId
      })
    : null;

  if (cacheKey) {
    const cachedDecision = getCachedDecision(cacheKey);
    if (cachedDecision) {
      const failureState = getFailureState(gameId);
      return {
        provider: cachedDecision.provider,
        decision: cachedDecision.decision,
        metadata: buildMetadata(cachedDecision.decision, failureState.failureCount, {
          minimalPromptUsed
        })
      };
    }
  }

  return enqueueDecision(gameId, apiKey, async consumeToken => {
    const timeoutMs = computeAdaptiveTimeoutMs(input);
    const failureState = getFailureState(gameId);

    const finalizeSuccess = (
      provider: 'openai' | 'anthropic',
      decision: DecisionOutput,
      overrides: Partial<DecisionMetadata> = {}
    ): DecisionResult => {
      const result: DecisionResult = {
        provider,
        decision,
        metadata: buildMetadata(decision, failureState.failureCount, {
          minimalPromptUsed,
          ...overrides
        })
      };

      if (cacheKey) {
        setCachedDecision(cacheKey, { provider, decision });
      }

      return result;
    };

    const finalizeFailure = (
      reason: string,
      overrides: Partial<DecisionMetadata> = {},
      alreadyIncremented = false
    ): DecisionResult => {
      const failureCount = alreadyIncremented
        ? failureState.failureCount
        : incrementFailureCount(gameId);
      const autoLoss = failureCount >= MAX_FAILURES;
      const decision = autoLoss ? buildAutoLossDecision() : buildFallbackDecision(reason);

      return {
        provider: 'fallback',
        decision,
        metadata: buildMetadata(decision, failureCount, {
          fallbackUsed: true,
          autoLoss,
          minimalPromptUsed,
          ...overrides
        })
      };
    };

    const attemptOpenAI = async (): Promise<ProviderAttemptResult> => {
      await consumeToken();
      try {
        const response = await callOpenAIDecisionWithCircuit(input, { promptMode, timeoutMs });
        recordUsage(gameId, 'openai', response.usage);
        return { ok: true, decision: response.decision };
      } catch (error) {
        if (error instanceof DecisionOutputValidationError) {
          if (error.usage) {
            recordUsage(gameId, 'openai', error.usage);
          }
          return { ok: false, errorType: 'invalid_output', error };
        }
        if (isTimeoutError(error)) {
          return { ok: false, errorType: 'timeout', error };
        }
        if (isRateLimitError(error)) {
          return { ok: false, errorType: 'rate_limit', error };
        }
        return { ok: false, errorType: 'provider_error', error };
      }
    };

    const attemptAnthropic = async (): Promise<ProviderAttemptResult> => {
      await consumeToken();
      try {
        const response = await callAnthropicDecision(input, { promptMode, timeoutMs });
        recordUsage(gameId, 'anthropic', response.usage);
        return { ok: true, decision: response.decision };
      } catch (error) {
        if (error instanceof DecisionOutputValidationError) {
          if (error.usage) {
            recordUsage(gameId, 'anthropic', error.usage);
          }
          return { ok: false, errorType: 'invalid_output', error };
        }
        if (isTimeoutError(error)) {
          return { ok: false, errorType: 'timeout', error };
        }
        if (isRateLimitError(error)) {
          return { ok: false, errorType: 'rate_limit', error };
        }
        return { ok: false, errorType: 'provider_error', error };
      }
    };

    let openaiResult = await attemptOpenAI();

    if (openaiResult.ok) {
      return finalizeSuccess('openai', openaiResult.decision);
    }

    if (openaiResult.errorType === 'invalid_output') {
      openaiResult = await attemptOpenAI();
      if (openaiResult.ok) {
        return finalizeSuccess('openai', openaiResult.decision);
      }
      if (openaiResult.errorType === 'invalid_output') {
        return finalizeFailure('Fallback decision after repeated invalid AI output.');
      }
    }

    if (openaiResult.errorType === 'timeout') {
      return finalizeFailure('Fallback decision after AI timeout (turn forfeited).', {
        timeoutForfeit: true
      });
    }

    if (openaiResult.errorType === 'rate_limit') {
      const rateLimitCount = incrementRateLimitCount(gameId);
      const rateLimitForgiven = rateLimitCount === 1;
      let failureAlreadyIncremented = false;

      if (!rateLimitForgiven) {
        const failureCount = incrementFailureCount(gameId);
        failureAlreadyIncremented = true;
        if (failureCount >= MAX_FAILURES) {
          return finalizeFailure('Automatic loss after repeated rate limit failures.', {
            rateLimitForgiven: false
          }, true);
        }
      }

      const anthropicResult = await attemptAnthropic();
      if (anthropicResult.ok) {
        return finalizeSuccess('anthropic', anthropicResult.decision, { rateLimitForgiven });
      }

      if (anthropicResult.errorType === 'invalid_output') {
        const retryResult = await attemptAnthropic();
        if (retryResult.ok) {
          return finalizeSuccess('anthropic', retryResult.decision, { rateLimitForgiven });
        }
        if (retryResult.errorType === 'invalid_output') {
          return finalizeFailure('Fallback decision after repeated invalid AI output.', {
            rateLimitForgiven
          }, failureAlreadyIncremented);
        }
        if (retryResult.errorType === 'provider_error') {
          return finalizeFailure(
            `Fallback decision after provider failure: ${formatProviderError(retryResult.error)}`,
            { rateLimitForgiven },
            failureAlreadyIncremented
          );
        }
      }

      if (anthropicResult.errorType === 'timeout') {
        return finalizeFailure('Fallback decision after AI timeout (turn forfeited).', {
          rateLimitForgiven,
          timeoutForfeit: true
        }, failureAlreadyIncremented);
      }

      if (anthropicResult.errorType === 'rate_limit') {
        const secondaryRateLimit = incrementRateLimitCount(gameId);
        const secondaryForgiven = secondaryRateLimit === 1;
        if (!secondaryForgiven && !failureAlreadyIncremented) {
          incrementFailureCount(gameId);
          failureAlreadyIncremented = true;
        }
        return finalizeFailure('Fallback decision after rate limit exhaustion.', {
          rateLimitForgiven: secondaryForgiven
        }, failureAlreadyIncremented);
      }

      return finalizeFailure(
        `Fallback decision after provider failure: ${formatProviderError(anthropicResult.error)}`,
        { rateLimitForgiven },
        failureAlreadyIncremented
      );
    }

    const anthropicResult = await attemptAnthropic();
    if (anthropicResult.ok) {
      return finalizeSuccess('anthropic', anthropicResult.decision);
    }

    if (anthropicResult.errorType === 'invalid_output') {
      const retryResult = await attemptAnthropic();
      if (retryResult.ok) {
        return finalizeSuccess('anthropic', retryResult.decision);
      }
      if (retryResult.errorType === 'invalid_output') {
        return finalizeFailure('Fallback decision after repeated invalid AI output.');
      }
      if (retryResult.errorType === 'timeout') {
        return finalizeFailure('Fallback decision after AI timeout (turn forfeited).', {
          timeoutForfeit: true
        });
      }
      if (retryResult.errorType === 'rate_limit') {
        const rateLimitCount = incrementRateLimitCount(gameId);
        const rateLimitForgiven = rateLimitCount === 1;
        const failureAlreadyIncremented = !rateLimitForgiven;
        if (failureAlreadyIncremented) {
          incrementFailureCount(gameId);
        }
        return finalizeFailure('Fallback decision after rate limit exhaustion.', {
          rateLimitForgiven
        }, failureAlreadyIncremented);
      }
      return finalizeFailure(
        `Fallback decision after provider failure: ${formatProviderError(retryResult.error)}`
      );
    }

    if (anthropicResult.errorType === 'timeout') {
      return finalizeFailure('Fallback decision after AI timeout (turn forfeited).', {
        timeoutForfeit: true
      });
    }

    if (anthropicResult.errorType === 'rate_limit') {
      const rateLimitCount = incrementRateLimitCount(gameId);
      const rateLimitForgiven = rateLimitCount === 1;
      const failureAlreadyIncremented = !rateLimitForgiven;
      if (failureAlreadyIncremented) {
        incrementFailureCount(gameId);
      }
      return finalizeFailure('Fallback decision after rate limit exhaustion.', {
        rateLimitForgiven
      }, failureAlreadyIncremented);
    }

    return finalizeFailure(
      `Fallback decision after provider failure: ${formatProviderError(anthropicResult.error)}`
    );
  });
}
