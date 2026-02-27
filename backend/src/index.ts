import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config, validateConfig } from './config/index';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { corsMiddleware } from './middleware/cors';
import { apiRouter } from './routes/api';
import { docsRouter } from './routes/docs';
import { metricsRouter } from './routes/metrics';
import { monitoringRouter } from './routes/monitoring';
import { metricsMiddleware, startAlertLogging } from './monitoring';
import { initializeSocketServer, closeSocketServer } from './socket/index';
import { requestStatsMiddleware } from './monitoring/requestStats';

// Validate configuration before starting server
// This implements fail-fast behavior - server refuses to start with invalid config
try {
  validateConfig();
} catch (error) {
  console.error('❌ Configuration validation failed:');
  console.error(error instanceof Error ? error.message : error);
  console.error('\n💡 Did you copy .env.example to .env and fill in your values?');
  process.exit(1);
}

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware - must be before routes
// Handles preflight OPTIONS and sets CORS headers for GitHub Pages frontend
app.use(corsMiddleware);

// Prometheus metrics middleware - collects HTTP request metrics
// Placed after CORS to track all requests
app.use(metricsMiddleware);

// Request stats middleware - tracks per-request latency and status codes
app.use(requestStatsMiddleware);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AI Governance Arena API',
    version: '1.1.0',
    environment: config.nodeEnv,
    status: 'operational'
  });
});

// Routes
app.use('/health', healthRouter);
app.use('/metrics', metricsRouter);
app.use('/monitoring', monitoringRouter);
app.use('/api', apiRouter);
app.use('/docs', docsRouter);
app.use('/openapi.json', docsRouter);

// 404 handler - must be before error handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler - must be last
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 AI Arena API server running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
});

// Initialize Socket.io server
initializeSocketServer(server);

// Start alert logging (every 60 seconds)
startAlertLogging(60000);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close Socket.io server first (to disconnect clients gracefully)
  await closeSocketServer();
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
