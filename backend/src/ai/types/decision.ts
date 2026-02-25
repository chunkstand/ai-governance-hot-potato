export type AnswerChoice = 'A' | 'B' | 'C' | 'D';

export interface DecisionOption {
  id: AnswerChoice;
  text: string;
}

export interface DecisionAgentMetadata {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface DecisionInput {
  promptVersion: string;
  visibleGameState: Record<string, unknown>;
  question: string;
  options: DecisionOption[];
  agent: DecisionAgentMetadata;
}

export interface DecisionAlternative {
  answer: AnswerChoice;
  reason: string;
}

export interface DecisionOutput {
  answer: AnswerChoice;
  reasoningSummary: string;
  confidence: number;
  alternatives: DecisionAlternative[];
}
