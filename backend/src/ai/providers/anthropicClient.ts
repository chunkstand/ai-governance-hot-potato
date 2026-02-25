import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { buildDecisionPrompt } from '../prompts/decisionPrompt';
import { DecisionInput, DecisionOutput } from '../types/decision';
import { validateDecisionOutput } from '../validation/decisionValidator';

const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_MAX_TOKENS = 512;
const ANTHROPIC_TIMEOUT_MS = 5000;

function getAnthropicClient(): Anthropic {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY for Anthropic client');
  }

  return new Anthropic({
    apiKey,
    timeout: ANTHROPIC_TIMEOUT_MS
  });
}

export async function callAnthropicDecision(input: DecisionInput): Promise<DecisionOutput> {
  const client = getAnthropicClient();
  const prompt = buildDecisionPrompt(input);

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

  const validation = validateDecisionOutput(outputText);
  if (!validation.ok) {
    throw new Error(`Anthropic response failed validation: ${JSON.stringify(validation.errors)}`);
  }

  return validation.value;
}
