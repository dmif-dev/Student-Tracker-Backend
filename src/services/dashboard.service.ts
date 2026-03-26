// backend/src/services/dashboard.service.ts
import { prisma } from '../lib/prisma.js';

export class DashboardService {
  async getStudentDashboardStats(studentId: string) {
    // Get student with relations
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { program: true, track: true, mentor: true }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const [sessions, progress, outcomes, weeklyReports, activities] = await Promise.all([
      prisma.session.count({
        where: { studentId, status: 'COMPLETED' }
      }),
      prisma.dailyProgress.count({
        where: { studentId }
      }),
      prisma.outcome.count({
        where: { studentId }
      }),
      prisma.weeklyReport.findMany({
        where: { studentId },
        orderBy: { weekStart: 'desc' },
        take: 5
      }),
      prisma.userActivity.findMany({
        where: { userId: student.userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // Calculate streak
    const streak = await this.calculateStreak(studentId);

    // Get upcoming sessions
    const upcomingSessions = await prisma.session.findMany({
      where: {
        studentId,
        date: { gte: new Date() },
        status: 'SCHEDULED'
      },
      orderBy: { date: 'asc' },
      take: 3,
      include: { mentor: true }
    });

    return {
      profile: {
        name: student.name,
        program: student.program?.name,
        track: student.track?.name,
        mentor: student.mentor?.name,
        progress: student.progress
      },
      stats: {
        totalSessions: sessions,
        totalProgressEntries: progress,
        totalOutcomes: outcomes,
        currentStreak: streak.current,
        maxStreak: streak.max
      },
      recentReports: weeklyReports,
      recentActivity: activities,
      upcomingSessions
    };
  }

  async getMentorDashboardStats(mentorId: string) {
    const [mentor, students, sessions, pendingReviews, documents] = await Promise.all([
      prisma.mentor.findUnique({
        where: { id: mentorId },
        include: { user: true }
      }),
      prisma.student.count({
        where: { mentorId }
      }),
      prisma.session.count({
        where: {
          mentorId,
          date: { gte: new Date() },
          status: 'SCHEDULED'
        }
      }),
      prisma.outcome.count({
        where: {
          mentorId,
          status: 'PENDING'
        }
      }),
      prisma.document.count({
        where: { uploadedById: mentorId }
      })
    ]);

    const recentStudents = await prisma.student.findMany({
      where: { mentorId },
      take: 5,
      orderBy: { lastActive: 'desc' },
      include: {
        user: { select: { email: true } }
      }
    });

    const upcomingSessions = await prisma.session.findMany({
      where: {
        mentorId,
        date: { gte: new Date() },
        status: 'SCHEDULED'
      },
      orderBy: { date: 'asc' },
      take: 5,
      include: { student: true }
    });

    return {
      profile: {
        name: mentor?.name,
        email: mentor?.user?.email,
        expertise: mentor?.expertise
      },
      stats: {
        totalStudents: students,
        upcomingSessions: sessions,
        pendingReviews,
        totalDocuments: documents
      },
      recentStudents,
      upcomingSessions
    };
  }

  async getAdminDashboardStats() {
    const [
      totalStudents,
      activeStudents,
      totalMentors,
      activeMentors,
      totalPrograms,
      totalOutcomes,
      recentActivity
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.mentor.count(),
      prisma.mentor.count({ where: { status: 'ACTIVE' } }),
      prisma.program.count(),
      prisma.outcome.count(),
      prisma.userActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: { email: true, role: true }
          }
        }
      })
    ]);

    const studentsByProgram = await prisma.student.groupBy({
      by: ['programId'],
      _count: true
    });

    const programs = await prisma.program.findMany({
      where: { id: { in: studentsByProgram.map(s => s.programId) } }
    });

    const programStats = studentsByProgram.map(sp => ({
      program: programs.find(p => p.id === sp.programId)?.name || 'Unknown',
      count: sp._count
    }));

    return {
      stats: {
        totalStudents,
        activeStudents,
        totalMentors,
        activeMentors,
        totalPrograms,
        totalOutcomes
      },
      programDistribution: programStats,
      recentActivity
    };
  }

  private async calculateStreak(studentId: string) {
    const progress = await prisma.dailyProgress.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    let currentStreak = 0;
    let maxStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < progress.length; i++) {
      const entryDate = new Date(progress[i].date);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === currentDate.getTime()) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate max streak
    let streak = 0;
    let lastDate: Date | null = null;

    for (const entry of progress) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (lastDate) {
        const diffDays = Math.abs(lastDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
        } else {
          maxStreak = Math.max(maxStreak, streak);
          streak = 1;
        }
      } else {
        streak = 1;
      }
      lastDate = entryDate;
    }
    maxStreak = Math.max(maxStreak, streak);

    return { current: currentStreak, max: maxStreak };
  }
}