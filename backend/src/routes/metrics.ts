import { Router, Request, Response } from 'express';
import { getRegistry } from '../monitoring';

export const metricsRouter = Router();

/**
 * GET /metrics
 * Returns Prometheus-compatible metrics in text format
 * 
 * Response content-type: text/plain; version=0.0.4; charset=utf-8
 * This is the standard Prometheus exposition format
 */
metricsRouter.get('/', async (_req: Request, res: Response) => {
  const registry = getRegistry();
  
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default metricsRouter;
