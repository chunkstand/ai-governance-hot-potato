"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.errorHandler = errorHandler;
const index_1 = require("../config/index");
/**
 * Custom API Error class
 * Allows throwing errors with specific status codes
 */
class ApiError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
/**
 * Global Express error handler middleware
 *
 * Must be registered AFTER all routes and BEFORE server starts
 *
 * Returns JSON error format per user decision: { error: "message" }
 * - 404 errors: { error: "Endpoint not found" }
 * - 500 errors: { error: "Internal server error" }
 *
 * In development: includes stack trace
 * In production: only includes error message (no stack trace for security)
 */
function errorHandler(err, _req, res, _next) {
    // Determine status code
    let statusCode = 500;
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
    }
    else if (res.statusCode === 404) {
        statusCode = 404;
    }
    // Build error response
    const errorResponse = {
        error: err.message || 'Internal server error'
    };
    // Include stack trace in development only
    if (index_1.config.nodeEnv === 'development' && err.stack) {
        errorResponse.stack = err.stack;
    }
    // Log error
    if (statusCode >= 500) {
        console.error('Server error:', err);
    }
    else {
        console.log(`Client error ${statusCode}:`, err.message);
    }
    res.status(statusCode).json(errorResponse);
}
//# sourceMappingURL=errorHandler.js.map