import { Request, Response, NextFunction } from 'express';
/**
 * Custom API Error class
 * Allows throwing errors with specific status codes
 */
export declare class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
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
export declare function errorHandler(err: Error | ApiError, _req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=errorHandler.d.ts.map