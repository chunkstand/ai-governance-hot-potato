import { describe, it, expect } from 'vitest';
import { calculateMove } from './moveResolver';

describe('calculateMove', () => {
  it('awards 2 spaces for correct fast answers', () => {
    const result = calculateMove('B', 'B', 8000, 'Transparency & Accountability', 'agent-1', 2);
    expect(result.spacesMoved).toBe(2);
    expect(result.toPosition).toBe(4);
    expect(result.isCorrect).toBe(true);
  });

  it('rounds medium speed correct answers to 1 space', () => {
    const result = calculateMove('B', 'B', 15000, 'Transparency & Accountability', 'agent-1', 5);
    expect(result.spacesMoved).toBe(1);
    expect(result.bonus).toBe(0.5);
    expect(result.toPosition).toBe(6);
  });

  it('awards 1 space for correct slow answers', () => {
    const result = calculateMove('B', 'B', 25000, 'Transparency & Accountability', 'agent-1', 1);
    expect(result.spacesMoved).toBe(1);
    expect(result.toPosition).toBe(2);
  });

  it('awards 1 space for incorrect but pillar-aligned answers', () => {
    const result = calculateMove('A', 'B', 12000, 'User Consent & Safety', 'agent-2', 3);
    expect(result.isCorrect).toBe(false);
    expect(result.spacesMoved).toBe(1);
    expect(result.toPosition).toBe(4);
  });

  it('awards 0 spaces for incorrect and non-aligned answers', () => {
    const result = calculateMove('A', 'B', 12000, 'Fairness & Inclusion', 'agent-3', 3);
    expect(result.isCorrect).toBe(false);
    expect(result.spacesMoved).toBe(0);
    expect(result.toPosition).toBe(3);
  });
});
