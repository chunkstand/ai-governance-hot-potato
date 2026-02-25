import OpenAI from 'openai';
import { config } from '../../config';
import { buildDecisionPrompt } from '../prompts/decisionPrompt';
import { DecisionInput, DecisionOutput } from '../types/decision';
import { validateDecisionOutput } from '../validation/decisionValidator';

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_MAX_OUTPUT_TOKENS = 512;
const OPENAI_TIMEOUT_MS = 5000;

function getOpenAIClient(): OpenAI {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for OpenAI client');
  }

  return new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS
  });
}

export async function callOpenAIDecision(input: DecisionInput): Promise<DecisionOutput> {
  const client = getOpenAIClient();
  const prompt = buildDecisionPrompt(input);

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

  return validation.value;
}
