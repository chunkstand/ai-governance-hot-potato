import { AnswerChoice, DecisionAlternative, DecisionOutput } from '../types/decision';

export interface DecisionValidationError {
  field: string;
  message: string;
}

export type DecisionValidationResult =
  | { ok: true; value: DecisionOutput }
  | { ok: false; errors: DecisionValidationError[]; raw?: unknown };

function isAnswerChoice(value: unknown): value is AnswerChoice {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

function validateAlternatives(value: unknown, errors: DecisionValidationError[]): DecisionAlternative[] {
  if (!Array.isArray(value)) {
    errors.push({ field: 'alternatives', message: 'alternatives must be an array' });
    return [];
  }

  return value
    .map((item, index): DecisionAlternative | null => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push({ field: `alternatives[${index}]`, message: 'alternative must be an object' });
        return null;
      }

      const alternative = item as Record<string, unknown>;
      const answer = alternative.answer;
      const reason = alternative.reason;

      if (!isAnswerChoice(answer)) {
        errors.push({ field: `alternatives[${index}].answer`, message: 'answer must be A, B, C, or D' });
      }

      if (typeof reason !== 'string' || reason.trim().length === 0) {
        errors.push({ field: `alternatives[${index}].reason`, message: 'reason must be a non-empty string' });
      }

      if (!isAnswerChoice(answer) || typeof reason !== 'string') {
        return null;
      }

      return {
        answer,
        reason: reason.trim()
      };
    })
    .filter((item): item is DecisionAlternative => item !== null);
}

export function validateDecisionOutput(rawOutput: string): DecisionValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawOutput);
  } catch (error) {
    return {
      ok: false,
      errors: [{ field: 'root', message: 'Output is not valid JSON' }]
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      errors: [{ field: 'root', message: 'Output must be a JSON object' }],
      raw: parsed
    };
  }

  const output = parsed as Record<string, unknown>;
  const errors: DecisionValidationError[] = [];

  const answer = output.answer;
  let normalizedAnswer: AnswerChoice | null = null;
  if (!isAnswerChoice(answer)) {
    errors.push({ field: 'answer', message: 'answer must be A, B, C, or D' });
  } else {
    normalizedAnswer = answer;
  }

  const reasoningSummary = output.reasoningSummary;
  let normalizedReasoningSummary: string | null = null;
  if (typeof reasoningSummary !== 'string' || reasoningSummary.trim().length === 0) {
    errors.push({ field: 'reasoningSummary', message: 'reasoningSummary must be a non-empty string' });
  } else {
    normalizedReasoningSummary = reasoningSummary.trim();
  }

  const confidence = output.confidence;
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    errors.push({ field: 'confidence', message: 'confidence must be a number between 0 and 1' });
  } else if (confidence < 0 || confidence > 1) {
    errors.push({ field: 'confidence', message: 'confidence must be between 0 and 1' });
  }

  const alternatives = validateAlternatives(output.alternatives, errors);

  if (errors.length > 0) {
    return { ok: false, errors, raw: parsed };
  }

  return {
    ok: true,
    value: {
      answer: normalizedAnswer as AnswerChoice,
      reasoningSummary: normalizedReasoningSummary as string,
      confidence: confidence as number,
      alternatives
    }
  };
}
