import { prisma } from './src/lib/prisma.js';

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PENDING';`);
    console.log('Enum updated successfully on the database!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
