import { describe, it, expect } from 'vitest';
import { calculateMove } from '../src/game/resolution/moveResolver';

describe('calculateMove', () => {
  it('awards base + AEL bonus for correct fast answers', () => {
    const result = calculateMove('B', 'B', 8000, 'Transparency & Accountability', 'agent-1', 2);
    expect(result.spacesMoved).toBe(3);
    expect(result.toPosition).toBe(5);
    expect(result.isCorrect).toBe(true);
  });

  it('awards bonus for correct medium-speed answers', () => {
    const result = calculateMove('B', 'B', 15000, 'Transparency & Accountability', 'agent-1', 5);
    expect(result.spacesMoved).toBe(2);
    expect(result.bonus).toBe(1);
    expect(result.toPosition).toBe(7);
  });

  it('awards base + bonus for correct slow answers', () => {
    const result = calculateMove('B', 'B', 25000, 'Transparency & Accountability', 'agent-1', 1);
    expect(result.spacesMoved).toBe(2);
    expect(result.toPosition).toBe(3);
  });

  it('awards 0 spaces for incorrect but pillar-aligned answers', () => {
    const result = calculateMove('A', 'B', 12000, 'User Consent & Safety', 'agent-2', 3);
    expect(result.isCorrect).toBe(false);
    expect(result.spacesMoved).toBe(0);
    expect(result.toPosition).toBe(3);
  });

  it('awards 0 spaces for incorrect and non-aligned answers', () => {
    const result = calculateMove('A', 'B', 12000, 'Fairness & Inclusion', 'agent-3', 3);
    expect(result.isCorrect).toBe(false);
    expect(result.spacesMoved).toBe(0);
    expect(result.toPosition).toBe(3);
  });
});
