import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Health Check Endpoint
 * 
 * GET /health
 * 
 * Returns 200 OK only when database is connected
 * Returns 503 Service Unavailable if database is disconnected
 * 
 * This endpoint is used by Render for automatic health monitoring
 * and auto-rollback on deployment failure.
 */
router.get('/', async (req, res) => {
  try {
    // Test database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed - database error:', error);
    
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRouter };
