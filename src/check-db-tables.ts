// backend/src/check-db-tables.ts
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from './config/index.js'

const pool = new Pool({
  connectionString: config.databaseUrl,
})

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

async function checkDatabaseTables() {
  console.log('Checking database tables...');
  
  try {
    // Query to get all tables in the public schema
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('Tables in database:');
    console.log(result);
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseTables();