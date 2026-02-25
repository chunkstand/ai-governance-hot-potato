import { Server as SocketIOServer, Socket } from 'socket.io';
import { getRoomByGameId, getRoomSpectatorCount } from '../roomManager';

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
    });

    // Handle spectator leaving a game
    socket.on('stop-watching', () => {
      const spectatorRoom = socket.data.spectatorRoom;
      const spectatorId = socket.data.spectatorId;
      const roomName = socket.data.roomName;
      
      if (spectatorRoom) {
        socket.leave(spectatorRoom);
        console.log(`👁️  Spectator ${spectatorId} left ${spectatorRoom}`);
        
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
      
      console.log(`👁️  Spectator namespace disconnect: ${socket.id} - ${reason}`);
      
      if (spectatorRoom && spectatorId && roomName) {
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
