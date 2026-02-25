export interface Checkpoint {
  id: string;
  name: string;
  questionId: string;
  position: number;
}

export interface MapConfig {
  totalCheckpoints: number;
  startPosition: number;
  finishPosition: number;
  checkpoints: Checkpoint[];
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  totalCheckpoints: 10,
  startPosition: 0,
  finishPosition: 9,
  checkpoints: [
    { id: 'cp-001', name: 'Checkpoint 1', questionId: 'q-001', position: 0 },
    { id: 'cp-002', name: 'Checkpoint 2', questionId: 'q-002', position: 1 },
    { id: 'cp-003', name: 'Checkpoint 3', questionId: 'q-003', position: 2 },
    { id: 'cp-004', name: 'Checkpoint 4', questionId: 'q-004', position: 3 },
    { id: 'cp-005', name: 'Checkpoint 5', questionId: 'q-005', position: 4 },
    { id: 'cp-006', name: 'Checkpoint 6', questionId: 'q-006', position: 5 },
    { id: 'cp-007', name: 'Checkpoint 7', questionId: 'q-007', position: 6 },
    { id: 'cp-008', name: 'Checkpoint 8', questionId: 'q-008', position: 7 },
    { id: 'cp-009', name: 'Checkpoint 9', questionId: 'q-009', position: 8 },
    { id: 'cp-010', name: 'Checkpoint 10', questionId: 'q-010', position: 9 }
  ]
};

export function isValidCheckpoint(
  checkpoint: Checkpoint,
  config: MapConfig = DEFAULT_MAP_CONFIG
): boolean {
  const withinBounds =
    checkpoint.position >= config.startPosition &&
    checkpoint.position <= config.finishPosition;

  return (
    withinBounds &&
    Boolean(checkpoint.id) &&
    Boolean(checkpoint.name) &&
    Boolean(checkpoint.questionId)
  );
}

export function getCheckpointByPosition(
  position: number,
  config: MapConfig = DEFAULT_MAP_CONFIG
): Checkpoint | null {
  return config.checkpoints.find(checkpoint => checkpoint.position === position) || null;
}
