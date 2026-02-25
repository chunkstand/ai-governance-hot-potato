import { GameState as CoreGameState } from '../../socket/gameStateManager';

export enum GamePhase {
  INIT = 'INIT',
  AWAITING_ANSWERS = 'AWAITING_ANSWERS',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  FINISHED = 'FINISHED'
}

export interface GameState extends CoreGameState {
  gameSession: CoreGameState['gameSession'] & { status: GamePhase };
}

export interface GameTransitionEvent {
  type: GamePhase;
}

const allowedTransitions: Record<GamePhase, GamePhase[]> = {
  [GamePhase.INIT]: [GamePhase.AWAITING_ANSWERS],
  [GamePhase.AWAITING_ANSWERS]: [GamePhase.PROCESSING],
  [GamePhase.PROCESSING]: [GamePhase.RESOLVED],
  [GamePhase.RESOLVED]: [GamePhase.AWAITING_ANSWERS, GamePhase.FINISHED],
  [GamePhase.FINISHED]: []
};

export function validateTransition(from: GamePhase, to: GamePhase): boolean {
  if (to === GamePhase.FINISHED) {
    return true;
  }

  return allowedTransitions[from].includes(to);
}

export function getPhase(state: GameState): GamePhase {
  const status = state.gameSession.status;
  if (!Object.values(GamePhase).includes(status)) {
    throw new Error(`Invalid game phase: ${status}`);
  }
  return status;
}

export function transition(currentState: GameState, event: GameTransitionEvent): GameState {
  const from = getPhase(currentState);
  const to = event.type;

  if (!validateTransition(from, to)) {
    throw new Error(`Invalid transition from ${from} to ${to}`);
  }

  return {
    ...currentState,
    gameSession: {
      ...currentState.gameSession,
      status: to,
      updatedAt: new Date(),
      finishedAt: to === GamePhase.FINISHED ? new Date() : currentState.gameSession.finishedAt
    }
  };
}
