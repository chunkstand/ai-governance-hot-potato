import { getCurrentState, updateGameState, broadcastGameState } from '../../socket/gameStateManager';
import { getRoomByGameId } from '../../socket/roomManager';
import { getIO } from '../../socket/index';
import { GamePhase, GameState, transition } from '../stateMachine/gameStateMachine';
import { deliverQuestion, recordAnswer, collectAnswers } from '../questions/questionService';
import { AnswerChoice, Question } from '../questions/questionBank';
import { resolveMoves } from '../resolution/moveResolver';

interface TurnState {
  question: Question;
  startedAt: number;
  pendingAgents: Set<string>;
  timer: NodeJS.Timeout | null;
}

const activeTurns = new Map<string, TurnState>();
const TURN_TIMEOUT_MS = 30000;

export function startTurn(gameId: string, question: Question): void {
  const currentState = getCurrentState(gameId) as GameState | null;
  if (!currentState) {
    throw new Error(`No game state found for ${gameId}`);
  }

  const pendingAgents = new Set(currentState.agents.map(agent => agent.id));
  const startedAt = Date.now();

  deliverQuestion(gameId, question);

  const existingTurn = activeTurns.get(gameId);
  if (existingTurn?.timer) {
    clearTimeout(existingTurn.timer);
  }

  const timer = setTimeout(() => {
    resolveTurn(gameId);
  }, TURN_TIMEOUT_MS);

  activeTurns.set(gameId, {
    question,
    startedAt,
    pendingAgents,
    timer
  });
}

export function collectAnswer(gameId: string, agentId: string, answer: AnswerChoice): void {
  const turn = activeTurns.get(gameId);
  if (!turn) {
    throw new Error(`No active turn for game ${gameId}`);
  }

  if (!turn.pendingAgents.has(agentId)) {
    return;
  }

  const timeMs = Date.now() - turn.startedAt;

  recordAnswer(gameId, {
    agentId,
    answer,
    timeMs
  });

  turn.pendingAgents.delete(agentId);

  if (turn.pendingAgents.size === 0) {
    handleAllAnswered(gameId);
  }
}

export function getPendingAgents(gameId: string): string[] {
  const turn = activeTurns.get(gameId);
  if (!turn) {
    return [];
  }

  return Array.from(turn.pendingAgents);
}

export function handleAllAnswered(gameId: string): void {
  const turn = activeTurns.get(gameId);
  if (!turn) {
    return;
  }

  if (turn.timer) {
    clearTimeout(turn.timer);
  }

  resolveTurn(gameId);
}

export function resolveTurn(gameId: string): void {
  const currentState = getCurrentState(gameId) as GameState | null;
  const turn = activeTurns.get(gameId);

  if (!currentState || !turn) {
    return;
  }

  const processingState = transition(currentState, { type: GamePhase.PROCESSING });
  updateGameState(gameId, {
    gameSession: {
      status: processingState.gameSession.status
    }
  });

  const answers = collectAnswers(gameId);
  const answerRecords = answers.map(answer => ({
    ...answer,
    currentPosition: currentState.agents.find(agent => agent.id === answer.agentId)?.position ?? 0
  }));
  const moveResults = resolveMoves(answerRecords, turn.question, gameId);

  const updatedAgents = currentState.agents.map(agent => {
    const move = moveResults.find(result => result.agentId === agent.id);
    if (!move) {
      return agent;
    }

    return {
      ...agent,
      position: move.toPosition,
      score: agent.score + move.spacesMoved
    };
  });

  const resolvedState = transition(processingState, { type: GamePhase.RESOLVED });
  updateGameState(gameId, {
    agents: updatedAgents,
    gameSession: {
      status: resolvedState.gameSession.status
    }
  });

  const io = getIO();
  const roomName = getRoomByGameId(gameId);
  if (io && roomName) {
    broadcastGameState(io, gameId, `${roomName}:spectators`);
  }

  if (turn.timer) {
    clearTimeout(turn.timer);
  }
  activeTurns.delete(gameId);
}

export default {
  startTurn,
  collectAnswer,
  resolveTurn,
  getPendingAgents,
  handleAllAnswered
};
