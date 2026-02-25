import {
  createDecisionCacheKey,
  getCachedDecision,
  setCachedDecision
} from './cache/decisionCache';
import { buildDecisionPrompt, PROMPT_VERSION } from './prompts/decisionPrompt';
import { callAnthropicDecision } from './providers/anthropicClient';
import { callOpenAIDecision } from './providers/openaiClient';
import { enqueueDecision } from './queue/decisionQueue';
import { DecisionInput, DecisionOutput } from './types/decision';

export interface DecisionRequest {
  gameId: string;
  apiKey: string;
  input: DecisionInput;
  deterministic?: boolean;
}

export interface DecisionResult {
  provider: 'openai' | 'anthropic';
  decision: DecisionOutput;
}

const CACHE_MODEL = 'gpt-4o-mini';

function formatProviderError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function generateDecision(request: DecisionRequest): Promise<DecisionResult> {
  const { gameId, apiKey, input } = request;
  const deterministic = request.deterministic ?? true;

  const cacheKey = deterministic
    ? createDecisionCacheKey({
        prompt: buildDecisionPrompt(input),
        model: CACHE_MODEL,
        promptVersion: input.promptVersion || PROMPT_VERSION,
        agentId: input.agent.id,
        gameId
      })
    : null;

  if (cacheKey) {
    const cachedDecision = getCachedDecision(cacheKey);
    if (cachedDecision) {
      return cachedDecision;
    }
  }

  return enqueueDecision(gameId, apiKey, async consumeToken => {
    await consumeToken();

    try {
      const decision = await callOpenAIDecision(input);
      const result: DecisionResult = { provider: 'openai', decision };
      if (cacheKey) {
        setCachedDecision(cacheKey, result);
      }
      return result;
    } catch (openaiError) {
      await consumeToken();

      try {
        const decision = await callAnthropicDecision(input);
        const result: DecisionResult = { provider: 'anthropic', decision };
        if (cacheKey) {
          setCachedDecision(cacheKey, result);
        }
        return result;
      } catch (anthropicError) {
        throw new Error(
          `Both AI providers failed. OpenAI error: ${formatProviderError(openaiError)}. ` +
            `Anthropic error: ${formatProviderError(anthropicError)}`
        );
      }
    }
  });
}
