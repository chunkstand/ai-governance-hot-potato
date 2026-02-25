/**
 * Server-side reconnection configuration
 * Client should use the same algorithm to maintain consistency
 * 
 * Requirements per 04-CONTEXT.md user decision:
 * - Initial delay: 1-3 seconds (randomized)
 * - Max retries: 10
 * - Exponential backoff with jitter
 */

export interface ReconnectionConfig {
  /** Initial delay range (milliseconds) - randomized per user decision */
  initialDelayMin: number;
  initialDelayMax: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay for exponential calculation (milliseconds) */
  baseDelay: number;
  /** Maximum delay cap (milliseconds) */
  maxDelay: number;
  /** Jitter range (milliseconds) - adds randomness to prevent thundering herd */
  jitterRange: number;
}

/**
 * Default reconnection configuration
 * Per user decision: 1-3 second initial delay, max 10 retries
 */
export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelayMin: 1000, // 1 second
  initialDelayMax: 3000, // 3 seconds (randomized per user decision)
  maxRetries: 10,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds cap
  jitterRange: 1000, // +/- 500ms jitter
};

/**
 * Calculate reconnection delay for a given attempt
 * Uses exponential backoff with jitter to prevent thundering herd
 * 
 * Formula: delay = min(baseDelay * 2^attempt + jitter, maxDelay)
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Reconnection configuration
 * @returns Delay in milliseconds before next reconnection attempt
 */
export function calculateBackoff(
  attempt: number,
  config: ReconnectionConfig = DEFAULT_RECONNECTION_CONFIG
): number {
  // For first attempt, use randomized initial delay
  if (attempt === 0) {
    return Math.floor(
      Math.random() * (config.initialDelayMax - config.initialDelayMin) + 
      config.initialDelayMin
    );
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Add jitter: +/- jitterRange/2
  const jitter = (Math.random() * config.jitterRange) - (config.jitterRange / 2);
  
  // Calculate total delay and cap at maxDelay
  const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
  
  // Ensure delay is positive
  return Math.max(Math.floor(delay), config.initialDelayMin);
}

/**
 * Get client-side reconnection configuration
 * Returns configuration object for Socket.io client options
 * 
 * @returns Socket.io reconnection options
 */
export function getClientReconnectionOptions(): {
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  randomizationFactor: number;
} {
  return {
    reconnection: true,
    reconnectionAttempts: DEFAULT_RECONNECTION_CONFIG.maxRetries,
    reconnectionDelay: DEFAULT_RECONNECTION_CONFIG.baseDelay,
    reconnectionDelayMax: DEFAULT_RECONNECTION_CONFIG.maxDelay,
    randomizationFactor: 0.5, // 50% jitter (matches our jitterRange logic)
  };
}

/**
 * Track reconnection state for a socket
 */
interface ReconnectionState {
  attempt: number;
  lastAttemptTime: number;
  nextAttemptDelay: number;
}

const reconnectionStates = new Map<string, ReconnectionState>();

/**
 * Record a reconnection attempt
 * @param socketId - Socket ID
 * @returns Current attempt number (0-indexed)
 */
export function recordAttempt(socketId: string): number {
  const state = reconnectionStates.get(socketId);
  
  if (state) {
    state.attempt++;
    state.lastAttemptTime = Date.now();
    state.nextAttemptDelay = calculateBackoff(state.attempt);
  } else {
    const initialDelay = calculateBackoff(0);
    reconnectionStates.set(socketId, {
      attempt: 0,
      lastAttemptTime: Date.now(),
      nextAttemptDelay: initialDelay,
    });
  }
  
  return reconnectionStates.get(socketId)!.attempt;
}

/**
 * Get reconnection state for a socket
 * @param socketId - Socket ID
 * @returns Reconnection state or null if not tracking
 */
export function getReconnectionState(socketId: string): ReconnectionState | null {
  return reconnectionStates.get(socketId) || null;
}

/**
 * Get time until next reconnection attempt
 * @param socketId - Socket ID
 * @returns Time in milliseconds, or -1 if not tracking
 */
export function getTimeUntilNextAttempt(socketId: string): number {
  const state = reconnectionStates.get(socketId);
  if (!state) return -1;
  
  const elapsed = Date.now() - state.lastAttemptTime;
  const remaining = state.nextAttemptDelay - elapsed;
  
  return Math.max(0, remaining);
}

/**
 * Clear reconnection state for a socket
 * Call this when reconnection succeeds or is cancelled
 * @param socketId - Socket ID
 */
export function clearReconnectionState(socketId: string): void {
  reconnectionStates.delete(socketId);
}

/**
 * Check if max retries exceeded
 * @param socketId - Socket ID
 * @returns true if max retries exceeded
 */
export function isMaxRetriesExceeded(socketId: string): boolean {
  const state = reconnectionStates.get(socketId);
  if (!state) return false;
  
  return state.attempt >= DEFAULT_RECONNECTION_CONFIG.maxRetries;
}

/**
 * Get reconnection summary for debugging
 * @param socketId - Socket ID
 * @returns Summary object or null if not tracking
 */
export function getReconnectionSummary(socketId: string): {
  attempt: number;
  maxRetries: number;
  remainingRetries: number;
  nextDelay: number;
  isMaxRetriesExceeded: boolean;
} | null {
  const state = reconnectionStates.get(socketId);
  if (!state) return null;
  
  return {
    attempt: state.attempt + 1, // 1-indexed for display
    maxRetries: DEFAULT_RECONNECTION_CONFIG.maxRetries,
    remainingRetries: DEFAULT_RECONNECTION_CONFIG.maxRetries - state.attempt,
    nextDelay: state.nextAttemptDelay,
    isMaxRetriesExceeded: state.attempt >= DEFAULT_RECONNECTION_CONFIG.maxRetries,
  };
}

/**
 * Calculate all delays for reconnection attempts
 * Useful for showing progression to users
 * @returns Array of delays for each attempt
 */
export function calculateAllDelays(): number[] {
  const delays: number[] = [];
  
  for (let i = 0; i < DEFAULT_RECONNECTION_CONFIG.maxRetries; i++) {
    delays.push(calculateBackoff(i));
  }
  
  return delays;
}

export default {
  DEFAULT_RECONNECTION_CONFIG,
  calculateBackoff,
  getClientReconnectionOptions,
  recordAttempt,
  getReconnectionState,
  getTimeUntilNextAttempt,
  clearReconnectionState,
  isMaxRetriesExceeded,
  getReconnectionSummary,
  calculateAllDelays,
};
