import { DecisionInput, DecisionOutput } from '../types/decision';
import { callAnthropicDecision } from './anthropicClient';
import { callOpenAIDecision } from './openaiClient';

export interface FallbackDecisionResult {
  provider: 'openai' | 'anthropic';
  decision: DecisionOutput;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function callDecisionWithFallback(
  input: DecisionInput
): Promise<FallbackDecisionResult> {
  try {
    const decision = await callOpenAIDecision(input);
    return { provider: 'openai', decision };
  } catch (openaiError) {
    try {
      const decision = await callAnthropicDecision(input);
      return { provider: 'anthropic', decision };
    } catch (anthropicError) {
      throw new Error(
        `Both AI providers failed. OpenAI error: ${formatError(openaiError)}. ` +
          `Anthropic error: ${formatError(anthropicError)}`
      );
    }
  }
}
