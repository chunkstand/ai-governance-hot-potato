import { Server as SocketIOServer, Socket } from 'socket.io';
import { getRoomByGameId, getRoomSpectatorCount } from '../roomManager';
import { 
  getCurrentState, 
  addSpectator, 
  removeSpectator, 
  createMockGameState,
} from '../gameStateManager';

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
 * Setup the /spectator namespace for viewer connections
 * Handles spectators joining game rooms to watch live updates
 */
export function setupSpectatorNamespace(io: SocketIOServer): void {
  const spectatorNamespace = io.of('/spectator');

  spectatorNamespace.on('connection', (socket: SpectatorSocket) => {
    console.log(`👁️  Spectator namespace connection: ${socket.id}`);

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
      
      console.log(`👁️  Spectator namespace disconnect: ${socket.id} - ${reason}`);
      
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
  });

  console.log('👁️  Spectator namespace (/spectator) initialized');
}
