// backend/src/check-models.ts
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from './config/index.js'

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
})

// Initialize Prisma with the same configuration as in lib/prisma.ts
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['query', 'error', 'warn'],
})

async function checkModels() {
  console.log('Checking available Prisma models...');
  
  try {
    // First, test the connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Get all model names from the prisma client
    // @ts-ignore - This is just for inspection
    const models = Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      // @ts-ignore
      typeof prisma[key] === 'object' &&
      !['$on', '$connect', '$disconnect', '$use', '$executeRaw', '$queryRaw', '$transaction'].includes(key)
    );
    
    console.log('\n📚 Available models:');
    models.forEach(model => console.log(`  - ${model}`));
    
    // Specifically check for program and track
    console.log('\n🔍 Checking specific models:');
    console.log('Has program model:', !!prisma.program);
    console.log('Has track model:', !!prisma.track);
    
    // If models exist, try a simple query
    // @ts-ignore
    if (prisma.program) {
      const programCount = await prisma.program.count();
      console.log(`\n📊 Program count in database: ${programCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();