import { prisma } from '../src/lib/prisma.ts';

async function main() {
  console.log('Fetching users from Prisma DB:');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
