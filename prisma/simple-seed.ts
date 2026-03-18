// backend/prisma/simple-seed.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Not found');

async function test() {
  console.log('Creating PostgreSQL connection pool...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Initializing Prisma client with adapter...');
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // First, check if any programs exist
    const programCount = await prisma.program.count();
    console.log(`📊 Program count: ${programCount}`);
    
    if (programCount === 0) {
      // Try to create a simple program
      console.log('Creating test program...');
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          description: 'Test Description',
        }
      });
      console.log('✅ Test program created:', program);
    } else {
      console.log('✅ Programs already exist, skipping creation');
      const programs = await prisma.program.findMany();
      console.log('Existing programs:', programs);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

test();