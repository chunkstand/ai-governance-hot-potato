import { DecisionInput } from '../types/decision';

export const PROMPT_VERSION = 'v1';

export type DecisionPromptMode = 'full' | 'minimal';

interface DecisionPromptOptions {
  mode?: DecisionPromptMode;
}

export function buildDecisionPrompt(
  input: DecisionInput,
  options: DecisionPromptOptions = {}
): string {
  const mode = options.mode ?? 'full';
  const optionsList = input.options
    .map(option => `${option.id}: ${option.text}`)
    .join('\n');

  if (mode === 'minimal') {
    const compactState = JSON.stringify(input.visibleGameState);

    return [
      'Return ONLY valid JSON with fields:',
      '{"answer":"A|B|C|D","reasoningSummary":"brief","confidence":0-1,"alternatives":[{"answer":"A|B|C|D","reason":"brief"}]}',
      'No extra text.',
      `PromptVersion: ${input.promptVersion || PROMPT_VERSION}`,
      'PromptMode: minimal',
      `AgentId: ${input.agent.id}`,
      `Question: ${input.question}`,
      'Options:',
      optionsList,
      `VisibleGameState: ${compactState}`
    ].join('\n');
  }

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
