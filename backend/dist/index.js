"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const index_1 = require("./config/index");
const errorHandler_1 = require("./middleware/errorHandler");
const health_1 = require("./routes/health");
// Validate configuration before starting server
// This implements fail-fast behavior - server refuses to start with invalid config
try {
    (0, index_1.validateConfig)();
}
catch (error) {
    console.error('❌ Configuration validation failed:');
    console.error(error instanceof Error ? error.message : error);
    console.error('\n💡 Did you copy .env.example to .env and fill in your values?');
    process.exit(1);
}
const app = (0, express_1.default)();
exports.app = app;
// Security middleware
app.use((0, helmet_1.default)());
// Enable CORS for frontend
app.use((0, cors_1.default)({
    origin: index_1.config.corsOrigin,
    credentials: true
}));
// Compression middleware
app.use((0, compression_1.default)());
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Root endpoint - API info
app.get('/', (_req, res) => {
    res.json({
        name: 'AI Governance Arena API',
        version: '1.1.0',
        environment: index_1.config.nodeEnv,
        status: 'operational'
    });
});
// Routes
app.use('/health', health_1.healthRouter);
// app.use('/api/sessions', sessionRouter); // To be added in future tasks
// app.use('/api/agents', agentRouter); // To be added in future tasks
// 404 handler - must be before error handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global error handler - must be last
app.use(errorHandler_1.errorHandler);
// Start server
const server = app.listen(index_1.config.port, () => {
    console.log(`🚀 AI Arena API server running on port ${index_1.config.port}`);
    console.log(`📊 Environment: ${index_1.config.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${index_1.config.port}/health`);
});
exports.server = server;
// Graceful shutdown handler
const gracefulShutdown = (signal) => {
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
//# sourceMappingURL=index.js.map