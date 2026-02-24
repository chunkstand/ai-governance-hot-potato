/**
 * API Types
 * 
 * TypeScript interfaces matching OpenAPI schemas
 * for type-safe API development
 */

// Enums
export type GameSessionStatus = 'INIT' | 'AWAITING_ANSWERS' | 'PROCESSING' | 'RESOLVED' | 'FINISHED';
export type GameMode = 'demo' | 'ai';
export type AgentType = 'AI' | 'HUMAN' | 'DEMO_STRICT' | 'DEMO_LENIENT' | 'DEMO_BALANCED';
export type AnswerChoice = 'A' | 'B' | 'C' | 'D';

// Request Input Types
export interface CreateGameSessionInput {
  mode: GameMode;
  agents: CreateAgentInput[];
}

export interface CreateAgentInput {
  name: string;
  type: AgentType;
  color?: string;
}

// Response Types
export interface GameSession {
  id: string;
  status: GameSessionStatus;
  mode?: GameMode;
  agents: Agent[];
  moves?: Move[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
}

export interface GameSessionSummary {
  id: string;
  status: GameSessionStatus;
  agentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  color?: string;
  position: number;
  score: number;
  gameSessionId: string;
  decisions?: Decision[];
  moves?: Move[];
  createdAt: string;
}

export interface Decision {
  id: string;
  questionId: string;
  answer: AnswerChoice;
  reasoning: string;
  timeMs: number;
  isCorrect?: boolean | null;
  agentId: string;
  createdAt: string;
}

export interface Move {
  id: string;
  fromPosition: number;
  toPosition: number;
  spacesMoved: number;
  agentId: string;
  gameSessionId: string;
  createdAt: string;
}

// Error Type
export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Query Parameters
export interface ListSessionsQuery {
  status?: GameSessionStatus;
  limit?: string;
}
