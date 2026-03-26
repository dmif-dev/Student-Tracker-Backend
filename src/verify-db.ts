// backend/src/verify-db.ts
import { prisma } from './lib/prisma.js';

async function verifyDatabase() {
  console.log('🔍 Verifying database connection...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected\n');
    
    // Check tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('📊 Tables in database:');
    console.log(tables);
    console.log(`\nTotal tables: ${(tables as any[]).length}`);
    
    // Count records
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.mentor.count(),
      prisma.program.count(),
      prisma.outcome.count()
    ]);
    
    console.log('\n📈 Record counts:');
    console.log(`Users: ${counts[0]}`);
    console.log(`Students: ${counts[1]}`);
    console.log(`Mentors: ${counts[2]}`);
    console.log(`Programs: ${counts[3]}`);
    console.log(`Outcomes: ${counts[4]}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();