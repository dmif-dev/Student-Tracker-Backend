
import { SessionController } from './src/controllers/session.controller.js';
import { prisma } from './src/lib/prisma.js';

async function test() {
  const ctrl = new SessionController();
  const req = {
    body: {
      studentId: 'test',
      mentorId: 'test',
      date: new Date().toISOString(),
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

