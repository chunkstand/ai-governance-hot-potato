import { Pillar, type PillarScores } from './aelScoring';

export interface GameScore {
  agentId: string;
  checkpoint: number;
  totalScore: number;
  pillarScores: PillarScores;
  moveCount: number;
}

export interface MoveScoreInput {
  checkpoint: number;
  pillarScores: PillarScores;
  timeMs: number;
  isCorrect: boolean;
}

const SPEED_BONUS_THRESHOLD_MS = 10000;
const scores = new Map<string, Map<string, GameScore>>();

function calculatePillarBonus(pillarScores: PillarScores): number {
  const values = Object.values(pillarScores);
  if (!values.length) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.min(5, Math.round((average / 100) * 5));
}

function ensureScore(gameId: string, agentId: string): GameScore {
  const gameScores = scores.get(gameId) ?? new Map<string, GameScore>();
  if (!scores.has(gameId)) {
    scores.set(gameId, gameScores);
  }

  const existing = gameScores.get(agentId);
  if (existing) {
    return existing;
  }

  const initial: GameScore = {
    agentId,
    checkpoint: 0,
    totalScore: 0,
    pillarScores: {
      [Pillar.USER_CONSENT_SAFETY]: 0,
      [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 0,
      [Pillar.FAIRNESS_INCLUSION]: 0,
      [Pillar.ALIGNMENT_CONTROL]: 0
    },
    moveCount: 0
  };

  gameScores.set(agentId, initial);
  return initial;
}

export function updateScore(gameId: string, agentId: string, moveResult: MoveScoreInput): GameScore {
  const current = ensureScore(gameId, agentId);
  const pillarBonus = calculatePillarBonus(moveResult.pillarScores);
  const speedBonus = moveResult.timeMs <= SPEED_BONUS_THRESHOLD_MS ? 2 : 0;
  const correctnessBonus = moveResult.isCorrect ? 10 : 0;
  const baseDelta = Math.max(0, moveResult.checkpoint - current.checkpoint) * 10;

  const nextScore: GameScore = {
    agentId,
    checkpoint: moveResult.checkpoint,
    totalScore: current.totalScore + baseDelta + pillarBonus + speedBonus + correctnessBonus,
    pillarScores: moveResult.pillarScores,
    moveCount: current.moveCount + 1
  };

  const gameScores = scores.get(gameId)!;
  gameScores.set(agentId, nextScore);

  return nextScore;
}

export function getAgentScore(gameId: string, agentId: string): GameScore {
  return ensureScore(gameId, agentId);
}

export function getLeaderboard(gameId: string): GameScore[] {
  const gameScores = scores.get(gameId);
  if (!gameScores) {
    return [];
  }

  return Array.from(gameScores.values()).sort((a, b) => {
    if (b.checkpoint !== a.checkpoint) {
      return b.checkpoint - a.checkpoint;
    }
    return b.totalScore - a.totalScore;
  });
}
