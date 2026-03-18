// backend/src/test-prisma.ts
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

console.log('PrismaClient type:', typeof PrismaClient)
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set')

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Create Prisma with adapter
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['query', 'error', 'warn'],
})
console.log('✅ Prisma instance created successfully')

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Connected to database')
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1+1 as result`
    console.log('✅ Query test passed:', result)
    
  } catch (error) {
    console.error('❌ Connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()