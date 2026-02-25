import { describe, expect, it } from 'vitest';
import { Pillar } from '../src/game/scoring/aelScoring';
import { getLeaderboard, updateScore } from '../src/game/scoring/gameScorer';

const baseScores = {
  [Pillar.USER_CONSENT_SAFETY]: 0,
  [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 0,
  [Pillar.FAIRNESS_INCLUSION]: 0,
  [Pillar.ALIGNMENT_CONTROL]: 0
};

describe('gameScorer leaderboard', () => {
  it('sorts by checkpoint desc then score desc', () => {
    const gameId = 'game-leaderboard-1';

    updateScore(gameId, 'agent-a', {
      checkpoint: 2,
      pillarScores: baseScores,
      timeMs: 5000,
      isCorrect: true
    });

    updateScore(gameId, 'agent-b', {
      checkpoint: 3,
      pillarScores: baseScores,
      timeMs: 20000,
      isCorrect: false
    });

    const leaderboard = getLeaderboard(gameId);

    expect(leaderboard[0].agentId).toBe('agent-b');
    expect(leaderboard[1].agentId).toBe('agent-a');
  });
});
