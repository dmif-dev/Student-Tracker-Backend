import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.notification.count();
  const group = await prisma.notification.groupBy({ by: ['userId'], _count: true });
  console.log('Total notifications:', count);
  console.log('By userId:', group);
}
main().finally(() => prisma.$disconnect());
