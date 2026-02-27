import { Router, Request, Response } from 'express';
import { buildMonitoringSummary } from '../monitoring/summary';

export const monitoringRouter = Router();

/**
 * GET /monitoring/summary
 * 
 * Returns a JSON summary of current system health and metrics:
 * - http: p95/p99 latency and 4xx/5xx error rates
 * - websocket: active connections and disconnect rate
 * - ai: daily cost and threshold
 * - system: CPU, memory, uptime
 * - alerts: list of active alerts
 * 
 * Response:
 * {
 *   "timestamp": "2026-02-27T22:00:00.000Z",
 *   "http": { ... },
 *   "websocket": { ... },
 *   "ai": { ... },
 *   "system": { ... },
 *   "alerts": { ... }
 * }
 */
monitoringRouter.get('/summary', (_req: Request, res: Response) => {
  try {
    const summary = buildMonitoringSummary();
    res.json(summary);
  } catch (error) {
    console.error('[Monitoring] Error building summary:', error);
    res.status(500).json({
      error: 'Failed to build monitoring summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default monitoringRouter;
