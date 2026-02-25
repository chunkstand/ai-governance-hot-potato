import OpenAI from 'openai';
import { config } from '../../config';
import { buildDecisionPrompt, DecisionPromptMode } from '../prompts/decisionPrompt';
import { DecisionInput, DecisionOutput } from '../types/decision';
import { validateDecisionOutput } from '../validation/decisionValidator';
import { ProviderUsage } from '../cost/costTypes';

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_MAX_OUTPUT_TOKENS = 512;
const OPENAI_TIMEOUT_MS = 5000;

export interface OpenAIDecisionOptions {
  promptMode?: DecisionPromptMode;
  timeoutMs?: number;
}

export interface OpenAIDecisionResponse {
  decision: DecisionOutput;
  usage: ProviderUsage;
}

function getOpenAIClient(timeoutMs?: number): OpenAI {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for OpenAI client');
  }

  return new OpenAI({
    apiKey,
    timeout: timeoutMs ?? OPENAI_TIMEOUT_MS
  });
}

export async function callOpenAIDecision(
  input: DecisionInput,
  options: OpenAIDecisionOptions = {}
): Promise<OpenAIDecisionResponse> {
  const client = getOpenAIClient(options.timeoutMs);
  const prompt = buildDecisionPrompt(input, { mode: options.promptMode });

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
    temperature: 0,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error('OpenAI response missing output_text');
  }

  const validation = validateDecisionOutput(outputText);
  if (!validation.ok) {
    throw new Error(`OpenAI response failed validation: ${JSON.stringify(validation.errors)}`);
  }

  const usage: ProviderUsage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    totalTokens:
      response.usage?.total_tokens ??
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
  };

  return { decision: validation.value, usage };
}
