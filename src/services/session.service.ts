// backend/src/services/session.service.ts
import { prisma } from '../lib/prisma.js';
import { SessionStatus } from '@prisma/client';

export class SessionService {
  async checkAvailability(mentorId: string, date: Date, startTime: string, endTime: string, excludeSessionId?: string) {
    // Check if mentor has availability for this time
    const dayOfWeek = date.getDay();
    
    const availability = await prisma.availability.findFirst({
      where: {
        mentorId,
        OR: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: date }
        ],
        startTime: { lte: startTime },
        endTime: { gte: endTime }
      }
    });

    if (!availability) {
      console.warn(`No explicit availability found for mentor ${mentorId} on ${date}. Proceeding to check conflicts.`);
      // return false;
    }

    // Check for conflicting sessions
    const conflictingSession = await prisma.session.findFirst({
      where: {
        mentorId,
        date,
        status: { notIn: ['CANCELLED'] },
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        OR: [
          {
            // New session starts during existing session
            startTime: { lte: startTime },
            endTime: { gt: startTime }
          },
          {
            // New session ends during existing session
            startTime: { lt: endTime },
            endTime: { gte: endTime }
          },
          {
            // New session contains existing session
            startTime: { gte: startTime },
            endTime: { lte: endTime }
          }
        ]
      }
    });

    return !conflictingSession;
  }

  async getUpcomingSessions(userId: string, role: string, days: number = 7) {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    let where: any = {
      date: { gte: now, lte: endDate },
      status: 'SCHEDULED'
    };

    if (role === 'MENTOR') {
      const mentor = await prisma.mentor.findUnique({ where: { userId } });
      if (mentor) where.mentorId = mentor.id;
    } else if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (student) where.studentId = student.id;
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            program: {
              select: { name: true }
            },
            track: true
          }
        },
        mentor: {
          select: {
            name: true,
            expertise: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return sessions;
  }

  async getSessionHistory(userId: string, role: string, limit: number = 20, offset: number = 0) {
    let where: any = {
      status: { in: ['COMPLETED', 'CANCELLED'] }
    };

    if (role === 'MENTOR') {
      const mentor = await prisma.mentor.findUnique({ where: { userId } });
      if (mentor) where.mentorId = mentor.id;
    } else if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (student) where.studentId = student.id;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          student: {
            select: {
              name: true,
              program: {
                select: { name: true }
              }
            }
          },
          mentor: {
            select: {
              name: true
            }
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.session.count({ where })
    ]);

    return {
      data: sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sessions.length < total
      }
    };
  }

  async generateMeetingLink(): Promise<string> {
    // Generate a unique meeting link (you can integrate with Zoom/Google Meet here)
    const meetingId = Math.random().toString(36).substring(2, 15);
    return `https://meet.google.com/${meetingId}`;
  }

  async sendSessionReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    const sessions = await prisma.session.findMany({
      where: {
        date: {
          gte: tomorrow,
          lt: nextDay
        },
        status: 'SCHEDULED'
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        mentor: {
          include: {
            user: true
          }
        }
      }
    });

    // Create notifications for each session
    for (const session of sessions) {
      // Notify student
      await prisma.notification.create({
        data: {
          userId: session.student.user.id,
          type: 'info',
          category: 'session',
          title: 'Upcoming Session Tomorrow',
          message: `You have a session with ${session.mentor.name} tomorrow at ${session.startTime}`,
          actionUrl: `/sessions/${session.id}`,
          actionText: 'View Session',
          metadata: { sessionId: session.id }
        }
      });

      // Notify mentor
      await prisma.notification.create({
        data: {
          userId: session.mentor.user.id,
          type: 'info',
          category: 'session',
          title: 'Upcoming Session Tomorrow',
          message: `You have a session with ${session.student.name} tomorrow at ${session.startTime}`,
          actionUrl: `/sessions/${session.id}`,
          actionText: 'View Session',
          metadata: { sessionId: session.id }
        }
      });
    }

    return sessions.length;
  }

  async getSessionStats(mentorId?: string, studentId?: string) {
    const where: any = {};
    if (mentorId) where.mentorId = mentorId;
    if (studentId) where.studentId = studentId;

    const [total, completed, cancelled, upcoming] = await Promise.all([
      prisma.session.count({ where }),
      prisma.session.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.session.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.session.count({
        where: {
          ...where,
          date: { gte: new Date() },
          status: 'SCHEDULED'
        }
      })
    ]);

    // Get monthly trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await prisma.session.groupBy({
      by: ['date'],
      where: {
        ...where,
        date: { gte: sixMonthsAgo }
      },
      _count: true,
      orderBy: {
        date: 'asc'
      }
    });

    // Group by month
    const monthlyTrend = monthlyData.reduce((acc: any, curr) => {
      const monthKey = curr.date.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, sessions: 0 };
      }
      acc[monthKey].sessions += curr._count;
      return acc;
    }, {});

    return {
      total,
      completed,
      cancelled,
      upcoming,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      monthlyTrend: Object.values(monthlyTrend)
    };
  }
}