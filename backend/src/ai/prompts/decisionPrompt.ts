import { DecisionInput } from '../types/decision';

export const PROMPT_VERSION = 'v1';

export function buildDecisionPrompt(input: DecisionInput): string {
  const optionsList = input.options
    .map(option => `${option.id}: ${option.text}`)
    .join('\n');

  const visibleState = JSON.stringify(input.visibleGameState, null, 2);

  return [
    'You are an AI agent making a governance decision for a real-time arena game.',
    'You MUST be deterministic: the same visible state and question must produce the same answer.',
    'Use only the visible game state provided (fog-of-war enforced).',
    'Follow the game rules uniformly across all agents. Do not add randomness.',
    '',
    'Return ONLY a JSON object that conforms exactly to this schema:',
    '{',
    '  "answer": "A" | "B" | "C" | "D",',
    '  "reasoningSummary": "1-2 sentence rationale",',
    '  "confidence": number between 0 and 1,',
    '  "alternatives": [',
    '    { "answer": "A" | "B" | "C" | "D", "reason": "brief reason" }',
    '  ]',
    '}',
    '',
    'No extra text. No markdown. No comments.',
    '',
    `PromptVersion: ${input.promptVersion || PROMPT_VERSION}`,
    `Agent: ${input.agent.name} (${input.agent.type}) [${input.agent.id}]`,
    `Question: ${input.question}`,
    'Options:',
    optionsList,
    'VisibleGameState:',
    visibleState
  ].join('\n');
}
