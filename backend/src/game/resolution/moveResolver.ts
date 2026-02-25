import type { AnswerChoice, GovernancePillar, Question } from '../questions/questionBank';
import { getAgentPosition, updatePosition } from '../position/positionTracker';
import {
  GOVERNANCE_PILLAR_TO_AEL,
  Pillar,
  applyMovementBonus,
  calculatePillarScore,
  type PillarScores
} from '../scoring/aelScoring';
import { updateScore } from '../scoring/gameScorer';

export interface MoveResult {
  agentId: string;
  fromPosition: number;
  toPosition: number;
  spacesMoved: number;
  isCorrect: boolean;
  timeMs: number;
  bonus: number;
  checkpoint: number;
  pillarScores: PillarScores;
}

export interface AnswerRecord {
  agentId: string;
  answer: AnswerChoice;
  timeMs: number;
  currentPosition?: number;
}

function buildPillarScores(answer: AnswerChoice, pillar: Pillar): PillarScores {
  const score = calculatePillarScore(answer, pillar);
  return {
    [Pillar.USER_CONSENT_SAFETY]: pillar === Pillar.USER_CONSENT_SAFETY ? score : 0,
    [Pillar.TRANSPARENCY_ACCOUNTABILITY]: pillar === Pillar.TRANSPARENCY_ACCOUNTABILITY ? score : 0,
    [Pillar.FAIRNESS_INCLUSION]: pillar === Pillar.FAIRNESS_INCLUSION ? score : 0,
    [Pillar.ALIGNMENT_CONTROL]: pillar === Pillar.ALIGNMENT_CONTROL ? score : 0
  };
}

function calculateBaseSpaces(isCorrect: boolean, timeMs: number): number {
  if (!isCorrect) {
    return 0;
  }
  if (timeMs < 10000) {
    return 2;
  }
  return 1;
}

export function calculateMove(
  answer: AnswerChoice,
  correctAnswer: AnswerChoice,
  timeMs: number,
  pillar: GovernancePillar,
  agentId: string = 'unknown',
  fromPosition: number = 0
): MoveResult {
  const isCorrect = answer === correctAnswer;
  const baseSpaces = calculateBaseSpaces(isCorrect, timeMs);
  const aelPillar = GOVERNANCE_PILLAR_TO_AEL[pillar];
  const pillarScores = buildPillarScores(answer, aelPillar);

  const rawSpaces = applyMovementBonus(baseSpaces, pillarScores, isCorrect);
  const spacesMoved = Math.max(0, Math.round(rawSpaces));
  const bonus = rawSpaces - baseSpaces;

  return {
    agentId,
    fromPosition,
    toPosition: fromPosition + spacesMoved,
    spacesMoved,
    isCorrect,
    timeMs,
    bonus,
    checkpoint: fromPosition + spacesMoved,
    pillarScores
  };
}

export function resolveMoves(
  answers: AnswerRecord[],
  question: Question,
  gameId?: string
): MoveResult[] {
  return answers.map(answer => {
    const currentPosition = answer.currentPosition
      ?? (gameId ? getAgentPosition(gameId, answer.agentId)?.checkpoint ?? 0 : 0);

    const moveResult = calculateMove(
      answer.answer,
      question.correctAnswer,
      answer.timeMs,
      question.pillar,
      answer.agentId,
      currentPosition
    );

    if (gameId) {
      updatePosition(gameId, answer.agentId, moveResult.toPosition);
      updateScore(gameId, answer.agentId, {
        checkpoint: moveResult.checkpoint,
        pillarScores: moveResult.pillarScores,
        timeMs: moveResult.timeMs,
        isCorrect: moveResult.isCorrect
      });
    }

    return moveResult;
  });
}

export default {
  calculateMove,
  resolveMoves
};
