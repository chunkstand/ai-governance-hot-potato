export type AnswerChoice = 'A' | 'B' | 'C' | 'D';

export type GovernancePillar =
  | 'User Consent & Safety'
  | 'Transparency & Accountability'
  | 'Fairness & Inclusion'
  | 'Alignment & Control';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: AnswerChoice;
  pillar: GovernancePillar;
}

const QUESTION_BANK: Question[] = [
  {
    id: 'q-001',
    text: 'When deploying an AI policy assistant, what is the most important first step?'
      + ' (User Consent & Safety)',
    options: [
      'A) Skip consent to reduce friction',
      'B) Obtain informed consent and explain risks',
      'C) Deploy first, ask later',
      'D) Let the AI decide who must consent'
    ],
    correctAnswer: 'B',
    pillar: 'User Consent & Safety'
  },
  {
    id: 'q-002',
    text: 'Which action best supports transparency in AI governance decisions?',
    options: [
      'A) Hide model logic to avoid confusion',
      'B) Provide clear rationale and decision criteria',
      'C) Only share results without context',
      'D) Disallow auditing of decisions'
    ],
    correctAnswer: 'B',
    pillar: 'Transparency & Accountability'
  },
  {
    id: 'q-003',
    text: 'How should an AI system handle data from underrepresented communities?',
    options: [
      'A) Exclude it to keep the model simple',
      'B) Oversample to reduce bias and improve fairness',
      'C) Treat it as noise',
      'D) Replace it with synthetic data without review'
    ],
    correctAnswer: 'B',
    pillar: 'Fairness & Inclusion'
  },
  {
    id: 'q-004',
    text: 'What is the best way to ensure an AI agent remains aligned with human values?',
    options: [
      'A) Remove all constraints once deployed',
      'B) Add continuous monitoring and human override',
      'C) Let the model self-define its goals',
      'D) Disable feedback mechanisms'
    ],
    correctAnswer: 'B',
    pillar: 'Alignment & Control'
  },
  {
    id: 'q-005',
    text: 'Which policy best protects user safety in AI-driven recommendations?',
    options: [
      'A) Prioritize engagement above all',
      'B) Require safety checks for high-risk content',
      'C) Allow anonymous changes without review',
      'D) Block all user reporting'
    ],
    correctAnswer: 'B',
    pillar: 'User Consent & Safety'
  },
  {
    id: 'q-006',
    text: 'What is a key accountability mechanism for AI governance?',
    options: [
      'A) No logs to protect privacy',
      'B) Audit trails of decisions and overrides',
      'C) Only internal documentation',
      'D) Avoid external review'
    ],
    correctAnswer: 'B',
    pillar: 'Transparency & Accountability'
  },
  {
    id: 'q-007',
    text: 'If an AI system shows biased outcomes, what is the correct response?',
    options: [
      'A) Ignore it if accuracy is high',
      'B) Investigate and adjust training data or constraints',
      'C) Reduce transparency to avoid criticism',
      'D) Blame users'
    ],
    correctAnswer: 'B',
    pillar: 'Fairness & Inclusion'
  },
  {
    id: 'q-008',
    text: 'Which control is most appropriate for high-stakes AI decisions?',
    options: [
      'A) Fully autonomous execution',
      'B) Human-in-the-loop approval',
      'C) No monitoring after deployment',
      'D) Immediate deployment without testing'
    ],
    correctAnswer: 'B',
    pillar: 'Alignment & Control'
  },
  {
    id: 'q-009',
    text: 'How should user consent be managed for AI policy changes?',
    options: [
      'A) Implied consent only',
      'B) Explicit consent with opt-out options',
      'C) No consent required',
      'D) Consent once, never revisit'
    ],
    correctAnswer: 'B',
    pillar: 'User Consent & Safety'
  },
  {
    id: 'q-010',
    text: 'What improves accountability when AI makes a governance decision?',
    options: [
      'A) Black-box outputs only',
      'B) Clear ownership and post-hoc review',
      'C) Hidden decision logs',
      'D) No escalation paths'
    ],
    correctAnswer: 'B',
    pillar: 'Transparency & Accountability'
  },
  {
    id: 'q-011',
    text: 'Which design choice supports fairness in AI evaluations?',
    options: [
      'A) Use a single demographic as the baseline',
      'B) Measure outcomes across diverse groups',
      'C) Remove protected attributes without analysis',
      'D) Ignore disparate impact'
    ],
    correctAnswer: 'B',
    pillar: 'Fairness & Inclusion'
  },
  {
    id: 'q-012',
    text: 'How can alignment be reinforced after deployment?',
    options: [
      'A) Disable all feedback',
      'B) Regularly evaluate and update guardrails',
      'C) Let the AI rewrite its own rules',
      'D) Remove human oversight'
    ],
    correctAnswer: 'B',
    pillar: 'Alignment & Control'
  }
];

function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getQuestion(id: string): Question | undefined {
  return QUESTION_BANK.find(question => question.id === id);
}

export function getRandomQuestion(excludeId?: string): Question {
  const pool = excludeId
    ? QUESTION_BANK.filter(question => question.id !== excludeId)
    : QUESTION_BANK;

  if (pool.length === 0) {
    return QUESTION_BANK[0];
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function getQuestionsForMap(count: number): Question[] {
  if (count <= 0) {
    return [];
  }

  const shuffled = shuffleQuestions(QUESTION_BANK);
  if (count >= shuffled.length) {
    return shuffled;
  }

  return shuffled.slice(0, count);
}
