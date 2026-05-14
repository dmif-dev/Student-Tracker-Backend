import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const group = await prisma.notification.groupBy({ by: ['category'], _count: true });
  console.log('By category:', group);
}
main().finally(() => prisma.$disconnect());
