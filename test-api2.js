
import { SessionController } from './src/controllers/session.controller.js';
import { prisma } from './src/lib/prisma.js';

async function test() {
  const ctrl = new SessionController();
  const mentor = await prisma.mentor.findFirst();
  const student = await prisma.student.findFirst({ where: { mentorId: mentor.id } });
  
  if (!mentor || !student) {
    console.log('No mentor/student found');
    return;
  }

  const req = {
    body: {
      studentId: student.id,
      mentorId: mentor.id,
      date: new Date(Date.now() + 86400000 * 2).toISOString(),
      startTime: '10:00',
      endTime: '11:00',
      topic: 'Test'
    },
    user: { role: 'STUDENT' }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log('STATUS:', code, 'DATA:', data)
    })
  };
  await ctrl.scheduleSession(req, res);
}
test().catch(console.error);

