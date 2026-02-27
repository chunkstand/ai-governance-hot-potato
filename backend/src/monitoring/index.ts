import promClient from 'prom-client';
import { Request, Response } from 'express';
import { getAlerts, startAlertLogging } from './alerts';

// Re-export alert functions
export { getAlerts, startAlertLogging };

// Type declaration for express-prometheus-middleware
// eslint-disable-next-line @typescript-eslint/no-var-requires
const expressPrometheusMiddleware = require('express-prometheus-middleware') as (options?: {
  collectDefaultMetrics?: boolean;
  metrics?: {
    labels?: {
      method?: (req: Request) => string;
      route?: (req: Request) => string;
      status?: (req: Request, res: Response) => string;
    };
    buckets?: number[];
  };
  prefix?: string;
}) => (req: Request, res: Response, next: () => void) => void;

/**
 * Prometheus monitoring setup
 * Provides metrics collection for production visibility
 */

// Create a Registry - this is the collector that aggregates all metrics
export const registry = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
// These are built-in metrics that prom-client provides
promClient.collectDefaultMetrics({ register: registry });

/**
 * Express Prometheus middleware
 * Tracks HTTP request metrics with low-cardinality labels
 * Excludes /metrics from self-scraping to avoid infinite loops
 */
export const metricsMiddleware = expressPrometheusMiddleware({
  collectDefaultMetrics: false, // We already collected them above
  metrics: {
    // Use low-cardinality labels only (method, route, status)
    // Avoids high-cardinality explosion with user IDs, socket IDs, game IDs
    labels: {
      method: (req: Request): string => req.method,
      route: (req: Request): string => {
        // Don't label the metrics endpoint itself to avoid self-scraping
        if (req.path === '/metrics') {
          return 'none';
        }
        // Use route pattern instead of exact path for grouping
        return req.route?.path || req.path;
      },
      status: (_req: Request, _res: Response): string => {
        // This is called after response, so res.statusCode is available
        return 'status';
      },
    },
    // Custom response time histogram buckets for AI arena traffic patterns
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  },
  prefix: 'ai_arena_',
});

/**
 * Get the Prometheus registry
 * Used by the /metrics endpoint to export metrics
 */
export function getRegistry(): promClient.Registry {
  return registry;
}

export default {
  registry,
  metricsMiddleware,
  getRegistry,
  startAlertLogging,
  getAlerts,
};
