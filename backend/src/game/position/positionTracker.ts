export interface Position {
  agentId: string;
  checkpoint: number;
  updatedAt: Date;
}

const positions = new Map<string, Map<string, Position>>();

export const canCollide = true;

export function updatePosition(
  gameId: string,
  agentId: string,
  newCheckpoint: number
): Position {
  const gamePositions = positions.get(gameId) ?? new Map<string, Position>();
  const updatedPosition: Position = {
    agentId,
    checkpoint: newCheckpoint,
    updatedAt: new Date()
  };

  gamePositions.set(agentId, updatedPosition);
  positions.set(gameId, gamePositions);

  return updatedPosition;
}

export function getPositions(gameId: string): Position[] {
  return Array.from(positions.get(gameId)?.values() ?? []);
}

export function getAgentPosition(gameId: string, agentId: string): Position | null {
  return positions.get(gameId)?.get(agentId) ?? null;
}

export function getLeaderboard(gameId: string): Position[] {
  return getPositions(gameId).sort((a, b) => b.checkpoint - a.checkpoint);
}

export default {
  updatePosition,
  getPositions,
  getAgentPosition,
  getLeaderboard,
  canCollide
};
