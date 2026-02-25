import { Server as SocketIOServer, Socket } from 'socket.io';
import { createGameRoom, getRoomByGameId } from '../roomManager';
import { registerSocket, isAlive } from '../heartbeat';

// Extended socket data interface
interface GameSocket extends Socket {
  data: {
    gameId?: string;
    agentId?: string;
    roomName?: string;
    [key: string]: unknown;
  };
}

/**
 * Setup the /game namespace for agent connections
 * Handles game logic connections (Phase 6 will add actual game logic)
 */
export function setupGameNamespace(io: SocketIOServer): void {
  const gameNamespace = io.of('/game');

  gameNamespace.on('connection', (socket: GameSocket) => {
    console.log(`🎮 Game namespace connection: ${socket.id}`);
    
    // Register socket for heartbeat monitoring
    registerSocket(socket);

    // Handle agent joining a game room
    socket.on('join-game', (data: { gameId: string; agentId: string }) => {
      const { gameId, agentId } = data;
      
      if (!gameId || !agentId) {
        socket.emit('error', { message: 'gameId and agentId are required' });
        return;
      }

      // Get or create room for this game
      let roomName = getRoomByGameId(gameId);
      if (!roomName) {
        roomName = createGameRoom(gameId);
      }

      // Join the room
      socket.join(roomName);
      socket.data.gameId = gameId;
      socket.data.agentId = agentId;
      socket.data.roomName = roomName;

      console.log(`🎮 Agent ${agentId} joined game ${gameId} in room ${roomName}`);
      
      socket.emit('joined-game', { 
        gameId, 
        roomName,
        agentId,
        timestamp: new Date().toISOString()
      });

      // Notify room of new agent
      socket.to(roomName).emit('agent-connected', {
        agentId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle agent leaving a game room
    socket.on('leave-game', () => {
      const roomName = socket.data.roomName;
      const agentId = socket.data.agentId;
      
      if (roomName) {
        socket.leave(roomName);
        console.log(`🎮 Agent ${agentId} left room ${roomName}`);
        
        socket.to(roomName).emit('agent-disconnected', {
          agentId,
          timestamp: new Date().toISOString()
        });
      }
      
      socket.data.gameId = undefined;
      socket.data.agentId = undefined;
      socket.data.roomName = undefined;
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      const roomName = socket.data.roomName;
      const agentId = socket.data.agentId;
      
      // Log heartbeat status on disconnect
      const alive = isAlive(socket);
      console.log(`🎮 Game namespace disconnect: ${socket.id} - ${reason} (heartbeat alive: ${alive})`);
      
      if (roomName && agentId) {
        socket.to(roomName).emit('agent-disconnected', {
          agentId,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  console.log('🎮 Game namespace (/game) initialized');
}
