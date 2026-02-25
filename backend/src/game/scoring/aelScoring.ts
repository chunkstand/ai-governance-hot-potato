import type { AnswerChoice, GovernancePillar } from '../questions/questionBank';

export enum Pillar {
  USER_CONSENT_SAFETY = 'USER_CONSENT_SAFETY',
  TRANSPARENCY_ACCOUNTABILITY = 'TRANSPARENCY_ACCOUNTABILITY',
  FAIRNESS_INCLUSION = 'FAIRNESS_INCLUSION',
  ALIGNMENT_CONTROL = 'ALIGNMENT_CONTROL'
}

export type PillarScores = Record<Pillar, number>;

export const GOVERNANCE_PILLAR_TO_AEL: Record<GovernancePillar, Pillar> = {
  'User Consent & Safety': Pillar.USER_CONSENT_SAFETY,
  'Transparency & Accountability': Pillar.TRANSPARENCY_ACCOUNTABILITY,
  'Fairness & Inclusion': Pillar.FAIRNESS_INCLUSION,
  'Alignment & Control': Pillar.ALIGNMENT_CONTROL
};

const ALIGNMENT_SCORE_BY_ANSWER: Record<AnswerChoice, number> = {
  A: 0,
  B: 100,
  C: 50,
  D: 0
};

export const DEMO_PILLAR_WEIGHTS: Record<string, PillarScores> = {
  DEMO_STRICT: {
    [Pillar.USER_CONSENT_SAFETY]: 1,
    [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 0.7,
    [Pillar.FAIRNESS_INCLUSION]: 0.6,
    [Pillar.ALIGNMENT_CONTROL]: 0.6
  },
  DEMO_LENIENT: {
    [Pillar.USER_CONSENT_SAFETY]: 0.6,
    [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 0.7,
    [Pillar.FAIRNESS_INCLUSION]: 0.6,
    [Pillar.ALIGNMENT_CONTROL]: 1
  },
  DEMO_BALANCED: {
    [Pillar.USER_CONSENT_SAFETY]: 0.8,
    [Pillar.TRANSPARENCY_ACCOUNTABILITY]: 0.8,
    [Pillar.FAIRNESS_INCLUSION]: 0.8,
    [Pillar.ALIGNMENT_CONTROL]: 0.8
  }
};

export function calculatePillarScore(answer: AnswerChoice, _pillar: Pillar): number {
  return ALIGNMENT_SCORE_BY_ANSWER[answer] ?? 0;
}

export function applyMovementBonus(
  baseSpaces: number,
  pillarScores: PillarScores,
  isCorrect: boolean
): number {
  if (!isCorrect) {
    return baseSpaces;
  }

  const scores = Object.values(pillarScores);
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  let bonus = 0;
  if (averageScore >= 75) {
    bonus = 1;
  } else if (averageScore >= 50) {
    bonus = 0.5;
  }

  return baseSpaces + bonus;
}
