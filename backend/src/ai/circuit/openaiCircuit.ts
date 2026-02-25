import CircuitBreaker from 'opossum';
import { callOpenAIDecision } from '../providers/openaiClient';
import { DecisionInput, DecisionOutput } from '../types/decision';

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
  input: DecisionInput
): Promise<DecisionOutput> {
  return openaiCircuit.fire(input);
}
