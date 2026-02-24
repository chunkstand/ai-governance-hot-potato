"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
/**
 * Validates that a string value is present and non-empty
 */
function requireEnvVar(name, value) {
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
/**
 * Validates the DATABASE_URL format
 * Must start with postgresql:// for PostgreSQL connectivity
 */
function validateDatabaseUrl(url) {
    if (!url.startsWith('postgresql://')) {
        throw new Error(`DATABASE_URL must start with "postgresql://"\n` +
            `Current value: ${url.substring(0, 20)}...\n` +
            `Expected format: postgresql://user:password@host:port/database`);
    }
}
/**
 * Validates NODE_ENV is one of the allowed values
 */
function validateNodeEnv(env) {
    const allowedEnvs = ['development', 'staging', 'production'];
    if (!allowedEnvs.includes(env)) {
        throw new Error(`NODE_ENV must be one of: ${allowedEnvs.join(', ')}\n` +
            `Current value: ${env}`);
    }
    return env;
}
/**
 * Validates PORT is a valid number
 */
function validatePort(portStr) {
    const defaultPort = 3000;
    if (!portStr) {
        return defaultPort;
    }
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`PORT must be a valid number between 1 and 65535\n` +
            `Current value: ${portStr}`);
    }
    return port;
}
/**
 * Validates all required environment variables
 * Implements fail-fast behavior - application refuses to start if configuration is invalid
 *
 * @throws Error if any required variable is missing or invalid
 * @returns Validated Config object
 */
function validateConfig() {
    const errors = [];
    // Track all missing/invalid variables before throwing
    const databaseUrl = process.env.DATABASE_URL;
    const corsOrigin = process.env.CORS_ORIGIN;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const portStr = process.env.PORT;
    // Validate required variables
    if (!databaseUrl) {
        errors.push('DATABASE_URL: Required for database connectivity');
    }
    if (!corsOrigin) {
        errors.push('CORS_ORIGIN: Required for frontend communication');
    }
    // If we have missing required vars, throw with helpful message
    if (errors.length > 0) {
        const errorMessage = [
            'Configuration validation failed:',
            ...errors.map(e => `  - ${e}`),
            '',
            '💡 Did you copy .env.example to .env and fill in your values?',
            '   cp backend/.env.example backend/.env',
            '   # Then edit .env with your actual values'
        ].join('\n');
        throw new Error(errorMessage);
    }
    // Validate individual values (these throw specific errors)
    try {
        validateNodeEnv(nodeEnv);
    }
    catch (e) {
        errors.push(`NODE_ENV: ${e instanceof Error ? e.message : e}`);
    }
    try {
        if (databaseUrl)
            validateDatabaseUrl(databaseUrl);
    }
    catch (e) {
        errors.push(`DATABASE_URL: ${e instanceof Error ? e.message : e}`);
    }
    // If any validation errors occurred, throw them
    if (errors.length > 0) {
        throw new Error(['Configuration validation failed:', ...errors].join('\n'));
    }
    // All validations passed - return typed config
    return {
        nodeEnv: validateNodeEnv(nodeEnv),
        port: validatePort(portStr),
        databaseUrl: requireEnvVar('DATABASE_URL', databaseUrl),
        corsOrigin: requireEnvVar('CORS_ORIGIN', corsOrigin),
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
    };
}
/**
 * Pre-validated configuration singleton
 * This will throw on module load if configuration is invalid
 * Import this to use configuration throughout the application
 */
exports.config = (() => {
    try {
        return validateConfig();
    }
    catch (error) {
        // Log and re-throw for the entry point to handle
        console.error('❌ Failed to load configuration:', error);
        throw error;
    }
})();
//# sourceMappingURL=index.js.map