import { Server as SocketIOServer, Socket } from 'socket.io';
import { getRoomByGameId, getRoomSpectatorCount } from '../roomManager';
import { 
  getCurrentState, 
  addSpectator, 
  removeSpectator, 
  createMockGameState,
} from '../gameStateManager';
import { registerSocket, isAlive } from '../heartbeat';

// Extended socket data interface
interface SpectatorSocket extends Socket {
  data: {
    gameId?: string;
    spectatorId?: string;
    roomName?: string;
    spectatorRoom?: string;
    [key: string]: unknown;
  };
}

/**
 * Map raw Socket.io disconnect reasons to normalized set
 */
function normalizeDisconnectReason(reason: string): string {
  const normalized = reason.toLowerCase();
  if (normalized.includes('ping timeout') || normalized.includes('timeout')) {
    return 'ping timeout';
  }
  if (normalized.includes('server disconnect')) {
    return 'server disconnect';
  }
  if (normalized.includes('client disconnect')) {
    return 'client disconnect';
  }
  if (normalized.includes('transport close')) {
    return 'transport close';
  }
  if (normalized.includes('transport error')) {
    return 'transport error';
  }
  return 'other';
}

/**
 * Setup the /spectator namespace for viewer connections
 * Handles spectators joining game rooms to watch live updates
 */
export function setupSpectatorNamespace(io: SocketIOServer): void {
  const spectatorNamespace = io.of('/spectator');

  spectatorNamespace.on('connection', (socket: SpectatorSocket) => {
    console.log(`👁️  Spectator namespace connection: ${socket.id}`);
    
    // Register socket for heartbeat monitoring
    registerSocket(socket);

    // Handle spectator joining a game room
    socket.on('watch-game', (data: { gameId: string }) => {
      const { gameId } = data;
      
      if (!gameId) {
        socket.emit('error', { message: 'gameId is required' });
        return;
      }

      // Find room for this game
      const roomName = getRoomByGameId(gameId);
      if (!roomName) {
        socket.emit('error', { message: `Game ${gameId} not found` });
        return;
      }

      // Join the spectator room (separate from agent room for isolation)
      const spectatorRoom = `${roomName}:spectators`;
      socket.join(spectatorRoom);
      socket.data.gameId = gameId;
      socket.data.spectatorId = socket.id;
      socket.data.roomName = roomName;
      socket.data.spectatorRoom = spectatorRoom;

      // Add spectator to game state
      addSpectator(gameId, socket.id);

      const spectatorCount = getRoomSpectatorCount(roomName);

      console.log(`👁️  Spectator watching game ${gameId} in ${spectatorRoom} (${spectatorCount} total spectators)`);
      
      socket.emit('watching-game', { 
        gameId, 
        roomName,
        spectatorId: socket.id,
        spectatorCount,
        timestamp: new Date().toISOString()
      });

      // Notify other spectators of new viewer
      socket.to(spectatorRoom).emit('spectator-joined', {
        spectatorId: socket.id,
        spectatorCount,
        timestamp: new Date().toISOString()
      });

      // Emit current game state immediately (full state dump for late joiners)
      const currentState = getCurrentState(gameId);
      if (currentState) {
        socket.emit('game:state', {
          gameSession: currentState.gameSession,
          agents: currentState.agents,
          currentQuestion: currentState.currentQuestion,
          spectators: currentState.spectators,
          round: currentState.round,
          timestamp: new Date().toISOString(),
        });
        console.log(`[SpectatorNamespace] Sent full game state to late joiner ${socket.id}`);
      } else {
        // No state exists yet - create mock state for testing
        // This ensures early spectators see something while waiting for Phase 6
        console.log(`[SpectatorNamespace] No game state found for ${gameId}, creating mock state`);
        const mockState = createMockGameState(gameId);
        socket.emit('game:state', {
          gameSession: mockState.gameSession,
          agents: mockState.agents,
          currentQuestion: mockState.currentQuestion,
          spectators: mockState.spectators,
          round: mockState.round,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle session:join (alias for watch-game for frontend compatibility)
    socket.on('session:join', (data: { sessionId: string }) => {
      // Emit watch-game event with same data
      socket.emit('watch-game', { gameId: data.sessionId });
    });

    // Handle spectator leaving a game
    socket.on('stop-watching', () => {
      const spectatorRoom = socket.data.spectatorRoom;
      const spectatorId = socket.data.spectatorId;
      const roomName = socket.data.roomName;
      const gameId = socket.data.gameId;
      
      if (spectatorRoom) {
        socket.leave(spectatorRoom);
        console.log(`👁️  Spectator ${spectatorId} left ${spectatorRoom}`);
        
        // Remove spectator from game state
        if (gameId) {
          removeSpectator(gameId, spectatorId || socket.id);
        }
        
        const spectatorCount = roomName ? getRoomSpectatorCount(roomName) : 0;
        socket.to(spectatorRoom).emit('spectator-left', {
          spectatorId,
          spectatorCount,
          timestamp: new Date().toISOString()
        });
      }
      
      socket.data.gameId = undefined;
      socket.data.spectatorId = undefined;
      socket.data.roomName = undefined;
      socket.data.spectatorRoom = undefined;
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      const spectatorRoom = socket.data.spectatorRoom;
      const spectatorId = socket.data.spectatorId;
      const roomName = socket.data.roomName;
      const gameId = socket.data.gameId;
      
      // Normalize disconnect reason for operator visibility
      const normalizedReason = normalizeDisconnectReason(reason);
      
      // Log with normalized reason for operator dashboards
      const alive = isAlive(socket);
      console.log(`👁️  Spectator namespace disconnect: ${socket.id} (spectator: ${spectatorId}, reason: ${normalizedReason}, heartbeat alive: ${alive})`);
      
      // Emit connection-status event for operator monitoring
      if (spectatorRoom && roomName && gameId) {
        const io = socket.nsp?.server;
        if (io) {
          io.to(spectatorRoom).emit('connection-status', {
            socketId: socket.id,
            type: 'disconnect',
            reason: normalizedReason,
            gameId,
            namespace: '/spectator',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (spectatorRoom && spectatorId && roomName) {
        // Remove spectator from game state
        if (gameId) {
          removeSpectator(gameId, spectatorId);
        }
        
        const spectatorCount = getRoomSpectatorCount(roomName);
        socket.to(spectatorRoom).emit('spectator-left', {
          spectatorId,
          spectatorCount,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle session:leave (alias for stop-watching)
    socket.on('session:leave', () => {
      socket.emit('stop-watching');
    });
  });

  console.log('👁️  Spectator namespace (/spectator) initialized');
}
