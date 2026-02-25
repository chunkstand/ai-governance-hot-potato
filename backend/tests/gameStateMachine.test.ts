import { describe, expect, it } from 'vitest';
import { GamePhase, GameState, transition, validateTransition } from '../src/game/stateMachine/gameStateMachine';

function createBaseState(status: GamePhase): GameState {
  return {
    gameSession: {
      id: 'game-001',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: null
    },
    agents: [],
    currentQuestion: null,
    spectators: [],
    round: 1,
    lastBroadcastAt: new Date()
  };
}

describe('gameStateMachine transitions', () => {
  it('allows INIT → AWAITING_ANSWERS → PROCESSING → RESOLVED', () => {
    const initState = createBaseState(GamePhase.INIT);
    const awaiting = transition(initState, { type: GamePhase.AWAITING_ANSWERS });
    const processing = transition(awaiting, { type: GamePhase.PROCESSING });
    const resolved = transition(processing, { type: GamePhase.RESOLVED });

    expect(awaiting.gameSession.status).toBe(GamePhase.AWAITING_ANSWERS);
    expect(processing.gameSession.status).toBe(GamePhase.PROCESSING);
    expect(resolved.gameSession.status).toBe(GamePhase.RESOLVED);
  });

  it('validates allowed transitions and rejects invalid ones', () => {
    expect(validateTransition(GamePhase.INIT, GamePhase.AWAITING_ANSWERS)).toBe(true);
    expect(validateTransition(GamePhase.AWAITING_ANSWERS, GamePhase.PROCESSING)).toBe(true);
    expect(validateTransition(GamePhase.PROCESSING, GamePhase.RESOLVED)).toBe(true);
    expect(validateTransition(GamePhase.RESOLVED, GamePhase.AWAITING_ANSWERS)).toBe(true);
    expect(validateTransition(GamePhase.RESOLVED, GamePhase.FINISHED)).toBe(true);
    expect(validateTransition(GamePhase.INIT, GamePhase.PROCESSING)).toBe(false);
  });
});
