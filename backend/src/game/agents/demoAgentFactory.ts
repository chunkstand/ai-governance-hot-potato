import { Agent, AgentType, AnswerChoice } from '../../types';
import { Question } from '../questions/questionBank';

export enum DemoAgentType {
  STRICT = 'STRICT',
  LENIENT = 'LENIENT',
  BALANCED = 'BALANCED',
  RANDOM = 'RANDOM'
}

export interface DemoAgentBehavior {
  type: DemoAgentType;
  chooseAnswer: (question: Question) => AnswerChoice;
}

const ANSWER_CHOICES: AnswerChoice[] = ['A', 'B', 'C', 'D'];

const BALANCED_PILLAR_ANSWER: Record<Question['pillar'], AnswerChoice> = {
  'User Consent & Safety': 'A',
  'Transparency & Accountability': 'B',
  'Fairness & Inclusion': 'C',
  'Alignment & Control': 'D'
};

const DEMO_TYPE_TO_AGENT_TYPE: Record<DemoAgentType, AgentType> = {
  [DemoAgentType.STRICT]: 'DEMO_STRICT',
  [DemoAgentType.LENIENT]: 'DEMO_LENIENT',
  [DemoAgentType.BALANCED]: 'DEMO_BALANCED',
  [DemoAgentType.RANDOM]: 'DEMO_RANDOM'
};

function deterministicChoice(seed: string): AnswerChoice {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ANSWER_CHOICES[total % ANSWER_CHOICES.length];
}

export function getDemoAgentBehavior(type: DemoAgentType): DemoAgentBehavior {
  switch (type) {
    case DemoAgentType.STRICT:
      return {
        type,
        chooseAnswer: () => 'B'
      };
    case DemoAgentType.LENIENT:
      return {
        type,
        chooseAnswer: () => 'A'
      };
    case DemoAgentType.BALANCED:
      return {
        type,
        chooseAnswer: (question) => BALANCED_PILLAR_ANSWER[question.pillar]
      };
    case DemoAgentType.RANDOM:
      return {
        type,
        chooseAnswer: (question) => deterministicChoice(`${type}:${question.id}`)
      };
    default:
      return {
        type,
        chooseAnswer: () => 'B'
      };
  }
}

export function createDemoAgent(
  type: DemoAgentType,
  id: string,
  name: string,
  color: string,
  gameSessionId: string = 'demo-session'
): Agent {
  return {
    id,
    name,
    type: DEMO_TYPE_TO_AGENT_TYPE[type],
    color,
    position: 0,
    score: 0,
    gameSessionId,
    createdAt: new Date().toISOString()
  };
}

export default {
  createDemoAgent,
  getDemoAgentBehavior
};
