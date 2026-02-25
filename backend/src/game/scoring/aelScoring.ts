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

const ANSWER_PILLAR_ALIGNMENT: Record<AnswerChoice, GovernancePillar> = {
  A: 'User Consent & Safety',
  B: 'Transparency & Accountability',
  C: 'Fairness & Inclusion',
  D: 'Alignment & Control'
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

export function calculatePillarScore(answer: AnswerChoice, pillar: Pillar): number {
  const alignedPillar = GOVERNANCE_PILLAR_TO_AEL[ANSWER_PILLAR_ALIGNMENT[answer]];

  if (alignedPillar === pillar) {
    return 100;
  }

  if (answer === 'C') {
    return 50;
  }

  return 0;
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
  const alignmentScore = scores.length
    ? Math.max(...scores)
    : 0;

  let bonus = 0;
  if (alignmentScore >= 75) {
    bonus = 1;
  } else if (alignmentScore >= 50) {
    bonus = 0.5;
  }

  return baseSpaces + bonus;
}
