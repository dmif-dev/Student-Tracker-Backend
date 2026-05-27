import { prisma } from './lib/prisma.js';

async function quickCounts() {
  try {
    await prisma.$connect();
    console.log('✅ Connected');
    
    const userCount = await prisma.user.count();
    const studentCount = await prisma.student.count();
    const mentorCount = await prisma.mentor.count();
    const programCount = await prisma.program.count();
    const docCount = await prisma.document.count();
    
    console.log('Users:', userCount);
    console.log('Students:', studentCount);
    console.log('Mentors:', mentorCount);
    console.log('Programs:', programCount);
    console.log('Documents:', docCount);

    const mentors = await prisma.mentor.findMany({
      select: {
        id: true,
        name: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });
    console.log('Mentors List:');
    console.log(JSON.stringify(mentors, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCounts();
