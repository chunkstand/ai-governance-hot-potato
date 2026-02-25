import type PQueue from 'p-queue';
import { RateLimiter } from 'limiter';

type DecisionTask<T> = (consumeToken: () => Promise<void>) => Promise<T>;

const QUEUE_IDLE_TTL_MS = 5 * 60 * 1000;
const TOKENS_PER_MINUTE = 60;

const queueRegistry = new Map<string, PQueue>();
const queueCleanupTimers = new Map<string, NodeJS.Timeout>();
const limiterRegistry = new Map<string, RateLimiter>();

let PQueueConstructor: typeof import('p-queue').default | null = null;

async function getPQueueConstructor(): Promise<typeof import('p-queue').default> {
  if (!PQueueConstructor) {
    const module = await import('p-queue');
    PQueueConstructor = module.default;
  }
  return PQueueConstructor;
}

async function getQueueForGame(gameId: string): Promise<PQueue> {
  const existing = queueRegistry.get(gameId);
  if (existing) {
    return existing;
  }

  const PQueueClass = await getPQueueConstructor();
  const queue = new PQueueClass({ concurrency: 1 });
  queueRegistry.set(gameId, queue);
  return queue;
}

function getLimiter(apiKey: string): RateLimiter {
  const existing = limiterRegistry.get(apiKey);
  if (existing) {
    return existing;
  }

  const limiter = new RateLimiter({ tokensPerInterval: TOKENS_PER_MINUTE, interval: 'minute' });
  limiterRegistry.set(apiKey, limiter);
  return limiter;
}

function scheduleQueueCleanup(gameId: string, queue: PQueue): void {
  const existingTimer = queueCleanupTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    if (queue.size === 0 && queue.pending === 0) {
      queueRegistry.delete(gameId);
      queueCleanupTimers.delete(gameId);
    }
  }, QUEUE_IDLE_TTL_MS);

  queueCleanupTimers.set(gameId, timer);
}

export async function enqueueDecision<T>(
  gameId: string,
  apiKey: string,
  task: DecisionTask<T>
): Promise<T> {
  const queue = await getQueueForGame(gameId);
  const limiter = getLimiter(apiKey);

  const existingTimer = queueCleanupTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    queueCleanupTimers.delete(gameId);
  }

  const consumeToken = async (): Promise<void> => {
    await limiter.removeTokens(1);
  };

  const result = await queue.add(() => task(consumeToken));
  void queue.onIdle().then(() => scheduleQueueCleanup(gameId, queue));
  return result;
}
