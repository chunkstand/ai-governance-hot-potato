import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config/index';
import { setupGameNamespace } from './namespaces/game';
import { setupSpectatorNamespace } from './namespaces/spectator';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server and attach to HTTP server
 * Sets up global connection logging and initializes all namespaces
 */
export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) {
    console.log('⚠️ Socket.io already initialized, returning existing instance');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.socketCorsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 30000,
    transports: ['websocket', 'polling']
  });

  // Global connection logging
  io.on('connection', (socket) => {
    console.log(`🔌 Global connection: ${socket.id} from ${socket.handshake.address}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Global disconnect: ${socket.id} - ${reason}`);
    });
  });

  // Initialize namespaces
  setupGameNamespace(io);
  setupSpectatorNamespace(io);

  console.log('✅ Socket.io initialized with game and spectator namespaces');
  
  return io;
}

/**
 * Get the Socket.io server instance
 * Returns null if not initialized
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Close Socket.io server and cleanup connections
 */
export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }

    console.log('🔌 Closing Socket.io server...');
    io.close(() => {
      console.log('✅ Socket.io server closed');
      io = null;
      resolve();
    });
  });
}
