import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * Extended Socket type with custom data properties
 */
export interface ExtendedSocket extends Socket {
  data: {
    gameId?: string;
    agentId?: string;
    roomName?: string;
    spectatorId?: string;
    spectatorRoom?: string;
    [key: string]: unknown;
  };
}

/**
 * Extended Socket.io Server type
 */
export type Server = SocketIOServer;

// Re-export Socket.io types for convenience
export type { Socket } from 'socket.io';
