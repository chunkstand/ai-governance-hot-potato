import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { config, validateConfig } from './config/index';
import { errorHandler } from './middleware/errorHandler';

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

// Enable CORS for frontend
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AI Governance Arena API',
    version: '1.1.0',
    environment: config.nodeEnv,
    status: 'operational'
  });
});

// Routes will be mounted here
// app.use('/health', healthRouter); // To be added in Task 4
// app.use('/api/sessions', sessionRouter); // To be added in future tasks
// app.use('/api/agents', agentRouter); // To be added in future tasks

// 404 handler - must be before error handler
app.use((req: Request, res: Response) => {
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

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
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
