import CircuitBreaker from 'opossum';
import { callOpenAIDecision, OpenAIDecisionOptions, OpenAIDecisionResponse } from '../providers/openaiClient';
import { DecisionInput } from '../types/decision';

const OPENAI_TIMEOUT_MS = 5000;
const OPENAI_RESET_TIMEOUT_MS = 60_000;
const OPENAI_ERROR_THRESHOLD_PERCENT = 100;
const OPENAI_VOLUME_THRESHOLD = 5;

const openaiCircuit = new CircuitBreaker(callOpenAIDecision, {
  timeout: OPENAI_TIMEOUT_MS,
  resetTimeout: OPENAI_RESET_TIMEOUT_MS,
  errorThresholdPercentage: OPENAI_ERROR_THRESHOLD_PERCENT,
  volumeThreshold: OPENAI_VOLUME_THRESHOLD
});

export async function callOpenAIDecisionWithCircuit(
  input: DecisionInput,
  options?: OpenAIDecisionOptions
): Promise<OpenAIDecisionResponse> {
  return openaiCircuit.fire(input, options);
}
