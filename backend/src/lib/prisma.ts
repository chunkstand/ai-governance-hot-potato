import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 
 * In development, we store the client on the global object to prevent
 * multiple instances during hot reloading.
 * 
 * In production, we create a fresh instance.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Store in global for development hot reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test database connectivity
 * @returns true if connected, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
