import { initializeGameState, updateGameState, broadcastGameState, getCurrentState } from '../../socket/gameStateManager';
import { createGameRoom, getRoomByGameId } from '../../socket/roomManager';
import { getIO } from '../../socket/index';
import { Agent, AgentType, AnswerChoice } from '../../types';
import { generateDecision } from '../../ai/decisionEngine';
import { PROMPT_VERSION } from '../../ai/prompts/decisionPrompt';
import type { DecisionInput } from '../../ai/types/decision';
import { Question, getQuestion, getRandomQuestion } from '../questions/questionBank';
import { GamePhase, GameState, transition } from '../stateMachine/gameStateMachine';
import { DemoAgentType, getDemoAgentBehavior } from '../agents/demoAgentFactory';
import { updatePosition, getPositions } from '../position/positionTracker';
import { resolveMoves, type MoveResult } from '../resolution/moveResolver';
import type { Checkpoint } from '../map/mapTypes';

export interface TournamentConfig {
  agents: Agent[];
  mapCheckpoints: Checkpoint[];
  timeLimit: number;
  gameId?: string;
  aiApiKey?: string;
}

export interface TournamentResult {
  winner: Agent | null;
  finalPositions: ReturnType<typeof getPositions>;
  moveHistory: MoveResult[];
  duration: number;
}

const DEMO_TYPE_BY_AGENT_TYPE: Partial<Record<AgentType, DemoAgentType>> = {
  DEMO_STRICT: DemoAgentType.STRICT,
  DEMO_LENIENT: DemoAgentType.LENIENT,
  DEMO_BALANCED: DemoAgentType.BALANCED,
  DEMO_RANDOM: DemoAgentType.RANDOM
};

const DEFAULT_DEMO_TIMES: Record<DemoAgentType, number> = {
  [DemoAgentType.STRICT]: 8000,
  [DemoAgentType.LENIENT]: 14000,
  [DemoAgentType.BALANCED]: 11000,
  [DemoAgentType.RANDOM]: 16000
};

function normalizeQuestionOptions(question: Question): DecisionInput['options'] {
  return question.options.map((text, index) => ({
    id: ['A', 'B', 'C', 'D'][index] as AnswerChoice,
    text
  }));
}

function toGameStateAgents(agents: Agent[]): GameState['agents'] {
  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    type: agent.type,
    color: agent.color ?? '#95A5A6',
    position: agent.position,
    score: agent.score,
    isConnected: true,
    lastActivity: new Date()
  }));
}

async function resolveAgentAnswer(
  agent: Agent,
  question: Question,
  gameId: string,
  timeLimit: number,
  aiApiKey?: string
): Promise<{ answer: AnswerChoice; timeMs: number }> {
  const demoType = DEMO_TYPE_BY_AGENT_TYPE[agent.type];
  if (demoType) {
    const behavior = getDemoAgentBehavior(demoType);
    const answer = behavior.chooseAnswer(question);
    const timeMs = Math.min(DEFAULT_DEMO_TIMES[demoType], timeLimit);
    return { answer, timeMs };
  }

  if (agent.type === 'AI' && aiApiKey) {
    const currentState = getCurrentState(gameId) as GameState | null;
    const input: DecisionInput = {
      promptVersion: PROMPT_VERSION,
      visibleGameState: (currentState ?? {}) as Record<string, unknown>,
      question: question.text,
      options: normalizeQuestionOptions(question),
      agent: {
        id: agent.id,
        name: agent.name,
        type: agent.type
      }
    };

    const start = Date.now();
    const decision = await generateDecision({
      gameId,
      apiKey: aiApiKey,
      input,
      deterministic: true
    });
    const timeMs = Math.min(Date.now() - start, timeLimit);
    return { answer: decision.decision.answer, timeMs };
  }

  const fallbackAnswer = ['A', 'B', 'C', 'D'][
    Math.abs(agent.id.length + question.id.length) % 4
  ] as AnswerChoice;
  return { answer: fallbackAnswer, timeMs: Math.min(20000, timeLimit) };
}

export async function runTournament(config: TournamentConfig): Promise<TournamentResult> {
  const startedAt = Date.now();
  const gameId = config.gameId ?? `tournament-${startedAt}`;
  const roomName = createGameRoom(gameId);
  const io = getIO();

  const initialPosition = config.mapCheckpoints[0]?.position ?? 0;
  let agents = config.agents.map(agent => ({
    ...agent,
    position: initialPosition,
    score: agent.score ?? 0
  }));

  agents.forEach(agent => {
    updatePosition(gameId, agent.id, initialPosition);
  });

  initializeGameState(gameId, {
    gameSession: {
      id: gameId,
      status: GamePhase.INIT,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    agents: toGameStateAgents(agents),
    round: 1
  });

  const moveHistory: MoveResult[] = [];

  for (let roundIndex = 0; roundIndex < config.mapCheckpoints.length; roundIndex += 1) {
    const checkpoint = config.mapCheckpoints[roundIndex];
    const question = getQuestion(checkpoint.questionId) ?? getRandomQuestion();
    const currentState = getCurrentState(gameId) as GameState | null;
    if (!currentState) {
      throw new Error(`Missing game state for tournament ${gameId}`);
    }

    const awaitingState = transition(currentState, { type: GamePhase.AWAITING_ANSWERS });
    updateGameState(gameId, {
      currentQuestion: {
        id: question.id,
        text: question.text,
        options: question.options
      },
      round: roundIndex + 1,
      gameSession: {
        status: awaitingState.gameSession.status
      }
    });

    if (io && roomName) {
      broadcastGameState(io, gameId, `${roomName}:spectators`);
    }

    const answers = await Promise.all(
      agents.map(async agent => {
        const { answer, timeMs } = await resolveAgentAnswer(
          agent,
          question,
          gameId,
          config.timeLimit,
          config.aiApiKey
        );
        return { agentId: agent.id, answer, timeMs };
      })
    );

    const processingState = transition(awaitingState, { type: GamePhase.PROCESSING });
    updateGameState(gameId, {
      gameSession: {
        status: processingState.gameSession.status
      }
    });

    const moveResults = resolveMoves(answers, question, gameId);
    moveHistory.push(...moveResults);

    agents = agents.map(agent => {
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
      agents: toGameStateAgents(agents),
      gameSession: {
        status: resolvedState.gameSession.status
      }
    });

    if (io) {
      const spectatorRoom = getRoomByGameId(gameId);
      if (spectatorRoom) {
        broadcastGameState(io, gameId, `${spectatorRoom}:spectators`);
      }
    }
  }

  const finishedState = getCurrentState(gameId) as GameState | null;
  if (finishedState) {
    const finalState = transition(finishedState, { type: GamePhase.FINISHED });
    updateGameState(gameId, {
      gameSession: {
        status: finalState.gameSession.status,
        finishedAt: finalState.gameSession.finishedAt
      }
    });
  }

  const winner = agents.reduce<Agent | null>((leading, agent) => {
    if (!leading) return agent;
    if (agent.position > leading.position) return agent;
    if (agent.position === leading.position && agent.score > leading.score) return agent;
    return leading;
  }, null);

  return {
    winner,
    finalPositions: getPositions(gameId),
    moveHistory,
    duration: Date.now() - startedAt
  };
}

export default {
  runTournament
};
