/**
 * Type declarations for express-prometheus-middleware
 */
import { Request, Response, NextFunction } from 'express';

export interface PrometheusMiddlewareOptions {
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
}

export type ExpressPrometheusMiddleware = (options?: PrometheusMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => void;

declare module 'express-prometheus-middleware' {
  const middleware: ExpressPrometheusMiddleware;
  export default middleware;
}
