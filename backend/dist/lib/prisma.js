"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testConnection = testConnection;
exports.disconnect = disconnect;
const client_1 = require("@prisma/client");
/**
 * Prisma Client Singleton
 *
 * In development, we store the client on the global object to prevent
 * multiple instances during hot reloading.
 *
 * In production, we create a fresh instance.
 */
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
});
// Store in global for development hot reloading
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
/**
 * Test database connectivity
 * @returns true if connected, false otherwise
 */
async function testConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}
/**
 * Gracefully disconnect from database
 */
async function disconnect() {
    await exports.prisma.$disconnect();
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map