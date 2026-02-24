import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Test database connectivity
 * @returns true if connected, false otherwise
 */
export declare function testConnection(): Promise<boolean>;
/**
 * Gracefully disconnect from database
 */
export declare function disconnect(): Promise<void>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map