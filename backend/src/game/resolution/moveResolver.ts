import { AnswerChoice, GovernancePillar, Question } from '../questions/questionBank';
import { getAgentPosition, updatePosition } from '../position/positionTracker';

export interface MoveResult {
  agentId: string;
  fromPosition: number;
  toPosition: number;
  spacesMoved: number;
  isCorrect: boolean;
  timeMs: number;
  bonus: number;
}

export interface AnswerRecord {
  agentId: string;
  answer: AnswerChoice;
  timeMs: number;
}

const PILLAR_ALIGNMENT: Record<AnswerChoice, GovernancePillar> = {
  A: 'User Consent & Safety',
  B: 'Transparency & Accountability',
  C: 'Fairness & Inclusion',
  D: 'Alignment & Control'
};

function isPillarAligned(answer: AnswerChoice, pillar: GovernancePillar): boolean {
  return PILLAR_ALIGNMENT[answer] === pillar;
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
  let spacesMoved = 0;
  let bonus = 0;

  if (isCorrect) {
    if (timeMs < 10000) {
      spacesMoved = 2;
    } else if (timeMs <= 20000) {
      spacesMoved = 1;
      bonus = 0.5;
    } else {
      spacesMoved = 1;
    }
  } else if (isPillarAligned(answer, pillar)) {
    spacesMoved = 1;
  }

  return {
    agentId,
    fromPosition,
    toPosition: fromPosition + spacesMoved,
    spacesMoved,
    isCorrect,
    timeMs,
    bonus
  };
}

export function resolveMoves(
  answers: AnswerRecord[],
  question: Question,
  gameId?: string
): MoveResult[] {
  return answers.map(answer => {
    const currentPosition = gameId
      ? getAgentPosition(gameId, answer.agentId)?.checkpoint ?? 0
      : 0;

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
    }

    return moveResult;
  });
}

export default {
  calculateMove,
  resolveMoves
};
