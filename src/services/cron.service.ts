// backend/src/services/cron.service.ts
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

export class CronService {
  start() {
    // Daily reminder for students to log progress
    cron.schedule('0 18 * * *', async () => {
      console.log('Running daily progress reminder...');
      
      const students = await prisma.student.findMany({
        where: { status: 'ACTIVE' },
        include: { user: true }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const student of students) {
        const hasProgress = await prisma.dailyProgress.findFirst({
          where: {
            studentId: student.id,
            date: { gte: today }
          }
        });

        if (!hasProgress) {
          await prisma.notification.create({
            data: {
              userId: student.user.id,
              type: 'warning',
              category: 'progress',
              title: 'Daily Progress Reminder',
              message: 'Don\'t forget to log your daily progress!',
              actionUrl: '/progress/new',
              actionText: 'Log Progress'
            }
          });
        }
      }
    });

    // Weekly report generation
    cron.schedule('0 9 * * 1', async () => {
      console.log('Generating weekly reports...');
      
      const students = await prisma.student.findMany({
        where: { status: 'ACTIVE' }
      });

      for (const student of students) {
        // Generate weekly report logic here
        console.log(`Generating report for ${student.name}`);
      }
    });

    // Session reminders (1 hour before)
    cron.schedule('* * * * *', async () => {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

      const sessions = await prisma.session.findMany({
        where: {
          date: {
            gte: new Date(oneHourFromNow.setMinutes(0, 0, 0)),
            lt: new Date(oneHourFromNow.setMinutes(59, 59, 999))
          },
          status: 'SCHEDULED'
        },
        include: {
          student: { include: { user: true } },
          mentor: { include: { user: true } }
        }
      });

      for (const session of sessions) {
        await prisma.notification.create({
          data: {
            userId: session.student.user.id,
            type: 'info',
            category: 'session',
            title: 'Upcoming Session',
            message: `Your session with ${session.mentor.name} starts in 1 hour`,
            actionUrl: `/sessions/${session.id}`,
            actionText: 'Join Session'
          }
        });

        await prisma.notification.create({
          data: {
            userId: session.mentor.user.id,
            type: 'info',
            category: 'session',
            title: 'Upcoming Session',
            message: `Your session with ${session.student.name} starts in 1 hour`,
            actionUrl: `/sessions/${session.id}`,
            actionText: 'Join Session'
          }
        });
      }
    });

    // Clean up old notifications (30 days)
    cron.schedule('0 2 * * *', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          isRead: true
        }
      });
    });
  }
}