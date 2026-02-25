import { prisma } from '../../lib/prisma';
import type { AnswerChoice } from '../questions/questionBank';

export interface MoveRecord {
  gameId: string;
  agentId: string;
  round: number;
  fromPosition: number;
  toPosition: number;
  spacesMoved: number;
  timestamp: Date;
  questionId: string;
  answer: AnswerChoice;
  isCorrect: boolean;
}

const moveHistory = new Map<string, MoveRecord[]>();

export async function recordMove(
  gameId: string,
  agentId: string,
  moveData: Omit<MoveRecord, 'gameId' | 'agentId' | 'timestamp'> & { timestamp?: Date }
): Promise<MoveRecord> {
  const record: MoveRecord = {
    gameId,
    agentId,
    timestamp: moveData.timestamp ?? new Date(),
    round: moveData.round,
    fromPosition: moveData.fromPosition,
    toPosition: moveData.toPosition,
    spacesMoved: moveData.spacesMoved,
    questionId: moveData.questionId,
    answer: moveData.answer,
    isCorrect: moveData.isCorrect
  };

  const existing = moveHistory.get(gameId) ?? [];
  existing.push(record);
  moveHistory.set(gameId, existing);

  try {
    await prisma.move.create({
      data: {
        fromPosition: record.fromPosition,
        toPosition: record.toPosition,
        spacesMoved: record.spacesMoved,
        agentId: record.agentId,
        gameSessionId: record.gameId,
        createdAt: record.timestamp
      }
    });
  } catch (error) {
    console.error('[MoveHistory] Failed to persist move record', error);
  }

  return record;
}

export function getMoveHistory(gameId: string): MoveRecord[] {
  return moveHistory.get(gameId) ?? [];
}

export function getAgentTrail(gameId: string, agentId: string): MoveRecord[] {
  return getMoveHistory(gameId).filter(record => record.agentId === agentId);
}

export function getRoundHistory(gameId: string, round: number): MoveRecord[] {
  return getMoveHistory(gameId).filter(record => record.round === round);
}
