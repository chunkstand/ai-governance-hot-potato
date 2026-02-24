"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
exports.healthRouter = router;
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
router.get('/', async (_req, res) => {
    try {
        // Test database connectivity with a simple query
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Health check failed - database error:', error);
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown database error',
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=health.js.map