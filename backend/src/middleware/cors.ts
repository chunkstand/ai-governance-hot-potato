import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * CORS Middleware Configuration
 * 
 * Allows requests from GitHub Pages frontend (chunkstand.github.io)
 * and local development origins.
 * 
 * Per requirement INF-03: CORS configured to allow GitHub Pages frontend
 */

// Parse CORS_ORIGIN env var to support multiple origins in development
function parseOrigins(originString: string): string[] | string {
  // If comma-separated, split into array
  if (originString.includes(',')) {
    return originString.split(',').map(o => o.trim()).filter(o => o);
  }
  return originString;
}

// Get allowed origins from config
const allowedOrigins = parseOrigins(config.corsOrigin);

/**
 * Custom CORS origin validator
 * Returns true if the origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (like mobile apps, curl, etc.)
  if (!origin) return true;
  
  // If allowedOrigins is a string, check exact match
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  // If allowedOrigins is an array, check if origin is in the list
  return allowedOrigins.includes(origin);
}

/**
 * CORS middleware function
 * Handles CORS headers for all requests including preflight OPTIONS
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (isOriginAllowed(origin)) {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins as string);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight
    
    // Note: credentials disabled for v1.1 (no cookies needed)
    // res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
}

/**
 * Get CORS configuration for external use
 * (e.g., for third-party middleware like 'cors' package)
 */
export function getCorsOptions() {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: false
  };
}
