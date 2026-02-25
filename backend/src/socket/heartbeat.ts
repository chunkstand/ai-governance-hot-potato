import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * Heartbeat configuration
 * Per requirements: 30-second ping-pong, 60-second stale detection
 */
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const STALE_THRESHOLD = 60000; // 60 seconds

/**
 * Track last ping response time for each socket
 */
const socketHealth = new Map<string, {
  lastPing: number;
  disconnectReason?: string;
}>();

/**
 * Heartbeat interval reference
 */
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Track heartbeat metrics
 */
const heartbeatMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  staleDisconnections: 0,
  heartbeatsSent: 0,
  pongsReceived: 0,
};

/**
 * Start heartbeat monitoring on all namespaces
 * @param io - Socket.io server instance
 */
export function startHeartbeat(io: SocketIOServer): void {
  if (heartbeatInterval) {
    console.log('[Heartbeat] Already running');
    return;
  }

  console.log(`[Heartbeat] Starting heartbeat (interval: ${HEARTBEAT_INTERVAL}ms, stale threshold: ${STALE_THRESHOLD}ms)`);

  heartbeatInterval = setInterval(() => {
    heartbeatMetrics.heartbeatsSent++;
    
    // Emit ping to all connected sockets across all namespaces
    const namespaces = ['/game', '/spectator'];
    const now = Date.now();
    
    namespaces.forEach(namespace => {
      const ns = io.of(namespace);
      ns.sockets.forEach((socket: Socket) => {
        // Check if socket is stale (no pong response within threshold)
        const health = socketHealth.get(socket.id);
        
        if (health) {
          const timeSinceLastPing = now - health.lastPing;
          
          if (timeSinceLastPing > STALE_THRESHOLD) {
            // Socket is stale - force disconnect
            console.log(`[Heartbeat] Stale connection detected: ${socket.id} (namespace: ${namespace}, last ping: ${timeSinceLastPing}ms ago)`);
            
            heartbeatMetrics.staleDisconnections++;
            socket.disconnect(true); // true = close connection immediately
            socketHealth.delete(socket.id);
            
            // Log disconnection reason as heartbeat timeout
            console.log(`[Heartbeat] Force-disconnected stale socket ${socket.id}`);
            return;
          }
        }
        
        // Send ping to socket
        socket.emit('ping', { timestamp: now });
      });
    });

    // Log metrics periodically (every 10 heartbeats = ~5 minutes)
    if (heartbeatMetrics.heartbeatsSent % 10 === 0) {
      logHeartbeatMetrics();
    }
  }, HEARTBEAT_INTERVAL);

  console.log('[Heartbeat] Heartbeat started');
}

/**
 * Stop heartbeat monitoring
 */
export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Heartbeat] Heartbeat stopped');
  }
}

/**
 * Register a socket for heartbeat monitoring
 * Called when a new socket connects
 * @param socket - Socket to register
 */
export function registerSocket(socket: Socket): void {
  // Record initial ping time
  socketHealth.set(socket.id, {
    lastPing: Date.now(),
  });
  
  heartbeatMetrics.totalConnections++;
  heartbeatMetrics.activeConnections = socketHealth.size;

  console.log(`[Heartbeat] Registered socket ${socket.id} (${socket.nsp?.name || 'unknown namespace'})`);

  // Listen for pong response from client
  socket.on('pong', (_data: { timestamp?: number }) => {
    const health = socketHealth.get(socket.id);
    if (health) {
      health.lastPing = Date.now();
      heartbeatMetrics.pongsReceived++;
      
      // Log occasional pongs for monitoring
      if (heartbeatMetrics.pongsReceived % 100 === 0) {
        console.log(`[Heartbeat] Received pong #${heartbeatMetrics.pongsReceived} from ${socket.id}`);
      }
    }
  });

  // Handle disconnect - clean up tracking
  socket.on('disconnect', (reason: string) => {
    const health = socketHealth.get(socket.id);
    if (health) {
      health.disconnectReason = reason;
      
      // Log if disconnect was due to heartbeat timeout
      if (reason === 'ping timeout' || reason === 'server disconnect') {
        console.log(`[Heartbeat] Socket ${socket.id} disconnected: ${reason}`);
      }
    }
    
    socketHealth.delete(socket.id);
    heartbeatMetrics.activeConnections = socketHealth.size;
    
    console.log(`[Heartbeat] Unregistered socket ${socket.id} (reason: ${reason})`);
  });
}

/**
 * Check if a socket is alive (has responded to ping within threshold)
 * @param socket - Socket to check
 * @returns true if socket is alive
 */
export function isAlive(socket: Socket): boolean {
  const health = socketHealth.get(socket.id);
  if (!health) return false;
  
  const timeSinceLastPing = Date.now() - health.lastPing;
  return timeSinceLastPing <= STALE_THRESHOLD;
}

/**
 * Get the time since last ping for a socket
 * @param socketId - Socket ID
 * @returns Time in milliseconds since last pong, or -1 if not tracked
 */
export function getLastPingTime(socketId: string): number {
  const health = socketHealth.get(socketId);
  if (!health) return -1;
  return Date.now() - health.lastPing;
}

/**
 * Get heartbeat metrics
 */
export function getHeartbeatMetrics(): typeof heartbeatMetrics & { trackedSockets: number } {
  return {
    ...heartbeatMetrics,
    trackedSockets: socketHealth.size,
  };
}

/**
 * Log current heartbeat metrics
 */
export function logHeartbeatMetrics(): void {
  console.log('[Heartbeat] Metrics:', {
    ...heartbeatMetrics,
    trackedSockets: socketHealth.size,
    uptime: process.uptime(),
  });
}

/**
 * Get all tracked socket IDs
 */
export function getTrackedSockets(): string[] {
  return Array.from(socketHealth.keys());
}

/**
 * Manually check for stale connections (for testing)
 * Returns list of stale socket IDs
 */
export function checkStaleConnections(): string[] {
  const stale: string[] = [];
  const now = Date.now();
  
  socketHealth.forEach((health, socketId) => {
    const timeSinceLastPing = now - health.lastPing;
    if (timeSinceLastPing > STALE_THRESHOLD) {
      stale.push(socketId);
    }
  });
  
  return stale;
}

export default {
  startHeartbeat,
  stopHeartbeat,
  registerSocket,
  isAlive,
  getLastPingTime,
  getHeartbeatMetrics,
  logHeartbeatMetrics,
  getTrackedSockets,
  checkStaleConnections,
};
