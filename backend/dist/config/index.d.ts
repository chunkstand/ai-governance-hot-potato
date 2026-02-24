/**
 * Environment configuration interface
 * All required fields must be present for the application to start
 */
export interface Config {
    nodeEnv: 'development' | 'staging' | 'production';
    port: number;
    databaseUrl: string;
    corsOrigin: string;
    openaiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
}
/**
 * Validates all required environment variables
 * Implements fail-fast behavior - application refuses to start if configuration is invalid
 *
 * @throws Error if any required variable is missing or invalid
 * @returns Validated Config object
 */
export declare function validateConfig(): Config;
/**
 * Pre-validated configuration singleton
 * This will throw on module load if configuration is invalid
 * Import this to use configuration throughout the application
 */
export declare const config: Config;
//# sourceMappingURL=index.d.ts.map