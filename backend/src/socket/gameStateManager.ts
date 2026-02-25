import { getAgentTrail, getMoveHistory, type MoveRecord } from '../game/history/moveHistory';

/**
 * GameState interface matching database schema
 * Full state representation for server-authoritative broadcasts
 */
export interface GameState {
  gameSession: {
    id: string;
    status: string; // INIT, AWAITING_ANSWERS, PROCESSING, RESOLVED, FINISHED
    createdAt: Date;
    updatedAt: Date;
    finishedAt?: Date | null;
  };
  agents: Array<{
    id: string;
    name: string;
    type: string;
    color: string;
    position: number;
    score: number;
    isConnected: boolean;
    lastActivity?: Date;
  }>;
  currentQuestion?: {
    id: string;
    text: string;
    options: string[];
  } | null;
  spectators: Array<{
    id: string;
    joinedAt: Date;
  }>;
  moveHistory?: MoveRecord[];
  lastBroadcastAt?: Date;
  round?: number;
}

/**
 * In-memory game state storage
 * Key: gameId (GameSession.id) -> Full game state
 */
const gameStateStore = new Map<string, GameState>();

/**
 * Track last broadcast times to enforce 500ms target
 * Key: gameId -> timestamp of last broadcast
 */
const lastBroadcastTimes = new Map<string, number>();

// Minimum time between broadcasts in milliseconds
const MIN_BROADCAST_INTERVAL = 500;

/**
 * Initialize game state for a new game session
 * @param gameId - The game session ID
 * @param sessionData - Initial session data from database
 */
export function initializeGameState(
  gameId: string,
  sessionData: Partial<GameState> & { gameSession: GameState['gameSession'] }
): GameState {
  const initialState: GameState = {
    gameSession: sessionData.gameSession,
    agents: sessionData.agents || [],
    currentQuestion: sessionData.currentQuestion || null,
    spectators: sessionData.spectators || [],
    moveHistory: sessionData.moveHistory || [],
    round: sessionData.round || 1,
    lastBroadcastAt: new Date(),
  };

  gameStateStore.set(gameId, initialState);
  lastBroadcastTimes.set(gameId, Date.now());

  console.log(`[GameStateManager] Initialized game state for game ${gameId}`);
  return initialState;
}

/**
 * Get current game state
 * @param gameId - The game session ID
 * @returns Current game state or null if not found
 */
export function getCurrentState(gameId: string): GameState | null {
  return gameStateStore.get(gameId) || null;
}

/**
 * Update game state with partial updates
 * Critical fields (agent positions, scores) are merged carefully
 * @param gameId - The game session ID
 * @param updates - Partial state updates to merge
 * @returns Updated game state or null if game not found
 */
export function updateGameState(
  gameId: string,
  updates: Partial<Omit<GameState, 'gameSession'>> & { gameSession?: Partial<GameState['gameSession']> }
): GameState | null {
  const currentState = gameStateStore.get(gameId);
  if (!currentState) {
    console.warn(`[GameStateManager] Cannot update - game ${gameId} not found`);
    return null;
  }

  // Merge updates into current state
  if (updates.agents) {
    // Update agent data - preserve existing agents not in update, merge existing
    const updatedAgentMap = new Map(updates.agents.map(a => [a.id, a]));
    
    currentState.agents = currentState.agents.map(agent => {
      const update = updatedAgentMap.get(agent.id);
      if (update) {
        return { ...agent, ...update };
      }
      return agent;
    });

    // Add any new agents from updates
    updates.agents.forEach(agent => {
      if (!currentState.agents.find(a => a.id === agent.id)) {
        currentState.agents.push(agent);
      }
    });
  }

  if (updates.currentQuestion !== undefined) {
    currentState.currentQuestion = updates.currentQuestion;
  }

  if (updates.spectators) {
    currentState.spectators = updates.spectators;
  }

  if (updates.moveHistory !== undefined) {
    currentState.moveHistory = updates.moveHistory;
  }

  if (updates.round !== undefined) {
    currentState.round = updates.round;
  }

  // Update game session fields if provided
  if (updates.gameSession) {
    currentState.gameSession = {
      ...currentState.gameSession,
      ...updates.gameSession,
    };
  }

  currentState.lastBroadcastAt = new Date();

  console.log(`[GameStateManager] Updated game state for ${gameId}`, {
    agentCount: currentState.agents.length,
    status: currentState.gameSession.status,
  });

  return currentState;
}

/**
 * Update a single agent's state
 * @param gameId - The game session ID
 * @param agentId - The agent ID to update
 * @param agentUpdate - Partial agent data to update
 */
export function updateAgentState(
  gameId: string,
  agentId: string,
  agentUpdate: Partial<GameState['agents'][0]>
): boolean {
  const state = gameStateStore.get(gameId);
  if (!state) return false;

  const agentIndex = state.agents.findIndex(a => a.id === agentId);
  if (agentIndex === -1) {
    console.warn(`[GameStateManager] Agent ${agentId} not found in game ${gameId}`);
    return false;
  }

  state.agents[agentIndex] = {
    ...state.agents[agentIndex],
    ...agentUpdate,
  };

  return true;
}

/**
 * Set agent connection status
 * @param gameId - The game session ID
 * @param agentId - The agent ID
 * @param isConnected - Connection status
 */
export function setAgentConnectionStatus(
  gameId: string,
  agentId: string,
  isConnected: boolean
): boolean {
  return updateAgentState(gameId, agentId, {
    isConnected,
    lastActivity: new Date(),
  });
}

/**
 * Add a spectator to the game state
 * @param gameId - The game session ID
 * @param spectatorId - The spectator socket ID
 */
export function addSpectator(gameId: string, spectatorId: string): boolean {
  const state = gameStateStore.get(gameId);
  if (!state) return false;

  if (!state.spectators.find(s => s.id === spectatorId)) {
    state.spectators.push({
      id: spectatorId,
      joinedAt: new Date(),
    });
  }

  return true;
}

/**
 * Remove a spectator from the game state
 * @param gameId - The game session ID
 * @param spectatorId - The spectator socket ID
 */
export function removeSpectator(gameId: string, spectatorId: string): boolean {
  const state = gameStateStore.get(gameId);
  if (!state) return false;

  const index = state.spectators.findIndex(s => s.id === spectatorId);
  if (index !== -1) {
    state.spectators.splice(index, 1);
  }

  return true;
}

/**
 * Broadcast game state to all spectators in a room
 * Uses Socket.io room broadcast for efficiency
 * Respects 500ms minimum broadcast interval
 * 
 * @param io - Socket.io server instance
 * @param gameId - The game session ID
 * @param roomName - The socket room name (e.g., 'game:001:spectators')
 * @returns true if broadcast was sent, false if debounced
 */
export function broadcastGameState(
  io: any, // SocketIOServer - using any to avoid circular dependency
  gameId: string,
  roomName: string
): boolean {
  const state = gameStateStore.get(gameId);
  if (!state) {
    console.warn(`[GameStateManager] Cannot broadcast - game ${gameId} not found`);
    return false;
  }

  // Check debounce interval
  const now = Date.now();
  const lastBroadcast = lastBroadcastTimes.get(gameId) || 0;
  const timeSinceLastBroadcast = now - lastBroadcast;

  if (timeSinceLastBroadcast < MIN_BROADCAST_INTERVAL) {
    // Debounce - too soon since last broadcast
    console.log(`[GameStateManager] Debounced broadcast for ${gameId} (${timeSinceLastBroadcast}ms since last)`);
    return false;
  }

  // Broadcast full state to all spectators
  const recentHistory = getMoveHistory(gameId).slice(-20);
  const broadcastData = {
    gameSession: state.gameSession,
    agents: state.agents,
    currentQuestion: state.currentQuestion,
    spectators: state.spectators,
    moveHistory: recentHistory,
    round: state.round,
    timestamp: new Date().toISOString(),
  };

  // Emit to spectator room
  io.to(roomName).emit('game:state', broadcastData);

  // Update last broadcast time
  lastBroadcastTimes.set(gameId, now);
  state.lastBroadcastAt = new Date();

  console.log(`[GameStateManager] Broadcasted state to ${roomName}`, {
    agentCount: state.agents.length,
    spectatorCount: state.spectators.length,
    timestamp: broadcastData.timestamp,
  });

  return true;
}

/**
 * Force broadcast (bypasses debounce)
 * Use for critical state changes only
 */
export function forceBroadcastGameState(
  io: any,
  gameId: string,
  roomName: string
): boolean {
  // Reset last broadcast time to bypass debounce
  lastBroadcastTimes.set(gameId, 0);
  return broadcastGameState(io, gameId, roomName);
}

/**
 * Clean up game state when session ends
 * @param gameId - The game session ID
 */
export function cleanupGameState(gameId: string): void {
  gameStateStore.delete(gameId);
  lastBroadcastTimes.delete(gameId);
  console.log(`[GameStateManager] Cleaned up game state for ${gameId}`);
}

/**
 * Create mock game state for testing
 * Until Phase 6 provides real game logic
 */
export function createMockGameState(gameId: string = 'mock-game-001'): GameState {
  const mockAgents = [
    {
      id: 'agent-001',
      name: 'Conservative Clara',
      type: 'DEMO_STRICT',
      color: '#FF6B6B',
      position: 12,
      score: 85,
      isConnected: true,
    },
    {
      id: 'agent-002',
      name: 'Progressive Paul',
      type: 'DEMO_LENIENT',
      color: '#4ECDC4',
      position: 18,
      score: 92,
      isConnected: true,
    },
    {
      id: 'agent-003',
      name: 'Balanced Betty',
      type: 'DEMO_BALANCED',
      color: '#45B7D1',
      position: 15,
      score: 88,
      isConnected: true,
    },
    {
      id: 'agent-004',
      name: 'Radical Ralph',
      type: 'AI',
      color: '#96CEB4',
      position: 22,
      score: 75,
      isConnected: false,
    },
  ];

  const mockQuestion = {
    id: 'q-001',
    text: 'Should AI systems be allowed to make autonomous governance decisions?',
    options: ['A) Yes, fully autonomous', 'B) Yes, with human oversight', 'C) No, humans must decide', 'D) Only for non-critical decisions'],
  };

  const mockState: GameState = {
    gameSession: {
      id: gameId,
      status: 'AWAITING_ANSWERS',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    agents: mockAgents,
    currentQuestion: mockQuestion,
    spectators: [],
    moveHistory: [],
    round: 1,
    lastBroadcastAt: new Date(),
  };

  // Store in memory
  gameStateStore.set(gameId, mockState);
  lastBroadcastTimes.set(gameId, Date.now());

  return mockState;
}

/**
 * Get all active game IDs
 * @returns Array of active game IDs
 */
export function getActiveGameIds(): string[] {
  return Array.from(gameStateStore.keys());
}

/**
 * Get active game count
 * @returns Number of active games
 */
export function getActiveGameCount(): number {
  return gameStateStore.size;
}

/**
 * Get move trail for a single agent (spectator queries)
 */
export function getTrailForAgent(gameId: string, agentId: string): MoveRecord[] {
  return getAgentTrail(gameId, agentId);
}

export default {
  initializeGameState,
  getCurrentState,
  updateGameState,
  updateAgentState,
  setAgentConnectionStatus,
  addSpectator,
  removeSpectator,
  broadcastGameState,
  forceBroadcastGameState,
  cleanupGameState,
  createMockGameState,
  getActiveGameIds,
  getActiveGameCount,
  getTrailForAgent,
};
