import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  stack?: string;
}

/**
 * Custom API Error class
 * Allows throwing errors with specific status codes
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
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
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine status code
  let statusCode = 500;
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
  } else if (res.statusCode === 404) {
    statusCode = 404;
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: err.message || 'Internal server error'
  };

  // Include stack trace in development only
  if (config.nodeEnv === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Log error
  if (statusCode >= 500) {
    console.error('Server error:', err);
  } else {
    console.log(`Client error ${statusCode}:`, err.message);
  }

  res.status(statusCode).json(errorResponse);
}
