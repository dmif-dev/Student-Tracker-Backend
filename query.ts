import { prisma } from './src/lib/prisma.js';
async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'smith@dmif.org' },
    include: {
      mentor: {
        include: {
          assignedStudents: true
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
