import { getRoomByGameId } from '../../socket/roomManager';
import { getIO } from '../../socket/index';
import { getCurrentState, updateGameState } from '../../socket/gameStateManager';
import { GamePhase, GameState, transition } from '../stateMachine/gameStateMachine';
import { AnswerChoice, Question } from './questionBank';

export interface AnswerSubmission {
  agentId: string;
  answer: AnswerChoice;
  timeMs: number;
}

export interface CollectedAnswer extends AnswerSubmission {
  receivedAt: Date;
}

const answerStore = new Map<string, Map<string, CollectedAnswer>>();
const answerTimers = new Map<string, NodeJS.Timeout>();

export function deliverQuestion(gameId: string, question: Question): void {
  const io = getIO();
  if (!io) {
    throw new Error('Socket.io server is not initialized');
  }

  const roomName = getRoomByGameId(gameId);
  if (!roomName) {
    throw new Error(`No room found for game ${gameId}`);
  }

  const gameNamespace = io.of('/game');

  gameNamespace.to(roomName).emit('game:question', {
    gameId,
    question,
    timestamp: new Date().toISOString()
  });

  // Reset answers for new round
  answerStore.set(gameId, new Map());

  const currentState = getCurrentState(gameId) as GameState | null;
  if (currentState) {
    const nextState = transition(currentState, { type: GamePhase.AWAITING_ANSWERS });
    updateGameState(gameId, {
      currentQuestion: {
        id: question.id,
        text: question.text,
        options: question.options
      },
      gameSession: {
        status: nextState.gameSession.status
      }
    });
  }
}

export function recordAnswer(gameId: string, submission: AnswerSubmission): void {
  const answers = answerStore.get(gameId) ?? new Map<string, CollectedAnswer>();
  answers.set(submission.agentId, {
    ...submission,
    receivedAt: new Date()
  });
  answerStore.set(gameId, answers);
}

export function collectAnswers(gameId: string): CollectedAnswer[] {
  return Array.from(answerStore.get(gameId)?.values() ?? []);
}

export function startAnswerTimer(gameId: string, timeoutMs: number = 30000): void {
  const existingTimer = answerTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    handleTimeout(gameId);
  }, timeoutMs);

  answerTimers.set(gameId, timer);
}

export function handleTimeout(gameId: string): void {
  const io = getIO();
  const roomName = getRoomByGameId(gameId);

  if (io && roomName) {
    io.of('/game').to(roomName).emit('game:timeout', {
      gameId,
      timestamp: new Date().toISOString()
    });
  }

  const currentState = getCurrentState(gameId) as GameState | null;
  if (currentState) {
    const nextState = transition(currentState, { type: GamePhase.PROCESSING });
    updateGameState(gameId, {
      gameSession: {
        status: nextState.gameSession.status
      }
    });
  }
}
