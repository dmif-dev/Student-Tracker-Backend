import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from './src/config/index.js'

const pool = new Pool({
  connectionString: config.databaseUrl,
})

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Connected');
    
    // @ts-ignore
    const programCount = await prisma.program.count();
    console.log('Program count:', programCount);
    
    // @ts-ignore
    const trackCount = await prisma.track.count();
    console.log('Track count:', trackCount);
    
    // @ts-ignore
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
