import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { buildDecisionPrompt, DecisionPromptMode } from '../prompts/decisionPrompt';
import { DecisionInput, DecisionOutput } from '../types/decision';
import { DecisionOutputValidationError, validateDecisionOutput } from '../validation/decisionValidator';
import { ProviderUsage } from '../cost/costTypes';

const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_MAX_TOKENS = 512;
const ANTHROPIC_TIMEOUT_MS = 5000;

export interface AnthropicDecisionOptions {
  promptMode?: DecisionPromptMode;
  timeoutMs?: number;
}

export interface AnthropicDecisionResponse {
  decision: DecisionOutput;
  usage: ProviderUsage;
}

function getAnthropicClient(timeoutMs?: number): Anthropic {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY for Anthropic client');
  }

  return new Anthropic({
    apiKey,
    timeout: timeoutMs ?? ANTHROPIC_TIMEOUT_MS
  });
}

export async function callAnthropicDecision(
  input: DecisionInput,
  options: AnthropicDecisionOptions = {}
): Promise<AnthropicDecisionResponse> {
  const client = getAnthropicClient(options.timeoutMs);
  const prompt = buildDecisionPrompt(input, { mode: options.promptMode });

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = response.content.find(block => block.type === 'text');
  const outputText = typeof textBlock?.text === 'string' ? textBlock.text.trim() : '';

  if (!outputText) {
    throw new Error('Anthropic response missing text content');
  }

  const usage: ProviderUsage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    totalTokens:
      response.usage?.input_tokens && response.usage?.output_tokens
        ? response.usage.input_tokens + response.usage.output_tokens
        : (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
  };

  const validation = validateDecisionOutput(outputText);
  if (!validation.ok) {
    throw new DecisionOutputValidationError(validation.errors, {
      provider: 'anthropic',
      usage,
      outputText
    });
  }

  return { decision: validation.value, usage };
}
