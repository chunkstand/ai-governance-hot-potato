import { callAnthropicDecision } from './providers/anthropicClient';
import { callOpenAIDecision } from './providers/openaiClient';
import { enqueueDecision } from './queue/decisionQueue';
import { DecisionInput, DecisionOutput } from './types/decision';

export interface DecisionRequest {
  gameId: string;
  apiKey: string;
  input: DecisionInput;
}

export interface DecisionResult {
  provider: 'openai' | 'anthropic';
  decision: DecisionOutput;
}

function formatProviderError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function generateDecision(request: DecisionRequest): Promise<DecisionResult> {
  const { gameId, apiKey, input } = request;

  return enqueueDecision(gameId, apiKey, async consumeToken => {
    await consumeToken();

    try {
      const decision = await callOpenAIDecision(input);
      return { provider: 'openai', decision };
    } catch (openaiError) {
      await consumeToken();

      try {
        const decision = await callAnthropicDecision(input);
        return { provider: 'anthropic', decision };
      } catch (anthropicError) {
        throw new Error(
          `Both AI providers failed. OpenAI error: ${formatProviderError(openaiError)}. ` +
            `Anthropic error: ${formatProviderError(anthropicError)}`
        );
      }
    }
  });
}
