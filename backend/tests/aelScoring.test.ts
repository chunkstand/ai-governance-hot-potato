import { describe, expect, it } from 'vitest';
import { Pillar, applyMovementBonus } from '../src/game/scoring/aelScoring';

describe('aelScoring applyMovementBonus', () => {
  it('adds full bonus for aligned pillar scores when correct', () => {
    const bonus = applyMovementBonus(2, {
      [Pillar.USER_CONSENT_SAFETY]: 90,
      [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 80,
      [Pillar.FAIRNESS_INCLUSION]: 85,
      [Pillar.ALIGNMENT_CONTROL]: 90
    }, true);

    expect(bonus).toBe(3);
  });

  it('adds half bonus for neutral pillar scores when correct', () => {
    const bonus = applyMovementBonus(1, {
      [Pillar.USER_CONSENT_SAFETY]: 60,
      [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 55,
      [Pillar.FAIRNESS_INCLUSION]: 50,
      [Pillar.ALIGNMENT_CONTROL]: 55
    }, true);

    expect(bonus).toBe(1.5);
  });

  it('does not add bonus when incorrect', () => {
    const bonus = applyMovementBonus(1, {
      [Pillar.USER_CONSENT_SAFETY]: 100,
      [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 100,
      [Pillar.FAIRNESS_INCLUSION]: 100,
      [Pillar.ALIGNMENT_CONTROL]: 100
    }, false);

    expect(bonus).toBe(1);
  });
});
