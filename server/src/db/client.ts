import { PrismaClient } from '@prisma/client'

// Singleton so we don't create a new pool on every hot-reload in dev.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
