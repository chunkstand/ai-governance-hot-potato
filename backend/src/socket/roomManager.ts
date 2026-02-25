/**
 * Room Manager for Socket.io game sessions
 * Manages room creation with sequential naming (game:001, game:002, etc.)
 * and tracks active rooms, spectators, and room cleanup
 */

interface RoomInfo {
  gameId: string;
  roomName: string;
  createdAt: Date;
  agentCount: number;
  spectatorCount: number;
}

// In-memory storage for active rooms
const activeRooms = new Map<string, RoomInfo>();
const gameIdToRoom = new Map<string, string>();

let roomCounter = 0;

/**
 * Generate a sequential room name (game:001, game:002, etc.)
 */
function generateRoomName(): string {
  roomCounter++;
  return `game:${String(roomCounter).padStart(3, '0')}`;
}

/**
 * Create a new game room for a given gameId
 * Returns the room name (e.g., "game:001")
 */
export function createGameRoom(gameId: string): string {
  // Check if room already exists for this game
  const existingRoom = gameIdToRoom.get(gameId);
  if (existingRoom) {
    return existingRoom;
  }

  // Create new room with sequential naming
  const roomName = generateRoomName();
  
  const roomInfo: RoomInfo = {
    gameId,
    roomName,
    createdAt: new Date(),
    agentCount: 0,
    spectatorCount: 0
  };

  activeRooms.set(roomName, roomInfo);
  gameIdToRoom.set(gameId, roomName);

  console.log(`🏠 Room created: ${roomName} for game ${gameId}`);
  
  return roomName;
}

/**
 * Get room name by gameId
 * Returns null if room doesn't exist
 */
export function getRoomByGameId(gameId: string): string | undefined {
  return gameIdToRoom.get(gameId);
}

/**
 * Get room info by room name
 */
export function getRoomInfo(roomName: string): RoomInfo | undefined {
  return activeRooms.get(roomName);
}

/**
 * Increment spectator count for a room
 */
export function incrementSpectatorCount(roomName: string): void {
  const room = activeRooms.get(roomName);
  if (room) {
    room.spectatorCount++;
  }
}

/**
 * Decrement spectator count for a room
 */
export function decrementSpectatorCount(roomName: string): void {
  const room = activeRooms.get(roomName);
  if (room && room.spectatorCount > 0) {
    room.spectatorCount--;
  }
}

/**
 * Get the number of spectators in a room
 */
export function getRoomSpectatorCount(roomName: string): number {
  const room = activeRooms.get(roomName);
  return room?.spectatorCount || 0;
}

/**
 * Get the total number of active rooms
 */
export function getActiveRoomCount(): number {
  return activeRooms.size;
}

/**
 * Get all active room names
 */
export function getAllRoomNames(): string[] {
  return Array.from(activeRooms.keys());
}

/**
 * Cleanup a room when it's no longer needed
 * Removes from tracking maps
 */
export function cleanupRoom(roomName: string): void {
  const room = activeRooms.get(roomName);
  if (room) {
    gameIdToRoom.delete(room.gameId);
    activeRooms.delete(roomName);
    console.log(`🧹 Room cleaned up: ${roomName}`);
  }
}

/**
 * Check if a room exists
 */
export function roomExists(roomName: string): boolean {
  return activeRooms.has(roomName);
}

/**
 * Reset room counter (useful for testing)
 */
export function resetRoomCounter(): void {
  roomCounter = 0;
}
