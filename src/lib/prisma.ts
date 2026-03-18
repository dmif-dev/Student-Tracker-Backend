// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { config } from '../config/index.js'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// In Prisma v7, the client automatically uses DATABASE_URL from environment
// We only need to configure logging options

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
})

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg(pool),
        log: config.nodeEnv === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    })

if (config.nodeEnv !== 'production') globalForPrisma.prisma = prisma

export default prisma