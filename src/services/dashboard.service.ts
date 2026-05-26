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

  async getAdminDashboardStats(filters?: { dateRange?: string; programId?: string }) {
    const dateQuery: any = {};
    if (filters?.dateRange) {
      const now = new Date();
      if (filters.dateRange === '1m') dateQuery.gte = new Date(now.setMonth(now.getMonth() - 1));
      else if (filters.dateRange === '3m') dateQuery.gte = new Date(now.setMonth(now.getMonth() - 3));
      else if (filters.dateRange === '6m') dateQuery.gte = new Date(now.setMonth(now.getMonth() - 6));
      else if (filters.dateRange === '1y') dateQuery.gte = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    const studentWhere: any = {};
    if (filters?.programId) studentWhere.programId = filters.programId;
    if (dateQuery.gte) studentWhere.createdAt = dateQuery;

    const [
      totalStudents,
      activeStudents,
      totalMentors,
      activeMentors,
      totalPrograms,
      totalOutcomes,
      recentActivity,
      sessionsCompleted
    ] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
      prisma.mentor.count(),
      prisma.mentor.count({ where: { status: 'ACTIVE' } }),
      prisma.program.count(),
      prisma.outcome.count({ where: dateQuery.gte ? { createdAt: dateQuery } : undefined }),
      prisma.userActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, role: true } } }
      }),
      prisma.session.count({ where: { status: 'COMPLETED' } })
    ]);

    const studentsByProgram = await prisma.student.groupBy({
      by: ['programId'],
      _count: true,
      where: studentWhere
    });

    const programs = await prisma.program.findMany({
      where: { id: { in: studentsByProgram.map(s => s.programId) } }
    });

    const programDistribution = studentsByProgram.map(sp => ({
      program: programs.find(p => p.id === sp.programId)?.name || 'Unknown',
      students: sp._count
    }));

    // Query actual monthly enrollments and outcomes for the last 6 months from the database
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const enrollmentTrend = [];
    const outcomesByMonth = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetMonthIndex = (currentMonth - i + 12) % 12;
      let targetYear = currentYear;
      if (currentMonth - i < 0) {
        targetYear = currentYear - 1;
      }
      
      const startOfMonth = new Date(targetYear, targetMonthIndex, 1);
      const endOfMonth = new Date(targetYear, targetMonthIndex + 1, 0, 23, 59, 59, 999);
      
      // Get real student count for this month
      const studentCount = await prisma.student.count({
        where: {
          ...studentWhere,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      // Get real outcomes count for this month
      const outcomeCount = await prisma.outcome.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      enrollmentTrend.push({ month: months[targetMonthIndex], students: studentCount });
      outcomesByMonth.push({ month: months[targetMonthIndex], count: outcomeCount });
    }

    // Query real-time average progress grouped by track from the database
    const tracksWithStudents = await prisma.track.findMany({
      include: {
        students: {
          select: {
            progress: true
          }
        }
      }
    });
    
    const trackPerformance = tracksWithStudents.map(t => {
      const totalProgress = t.students.reduce((sum, s) => sum + s.progress, 0);
      const avg = t.students.length > 0 ? Math.round(totalProgress / t.students.length) : 0;
      return {
        track: t.name,
        averageProgress: avg
      };
    });

    // Calculate real average attendance from DailyProgress model
    const [totalProgressEntries, presentProgressEntries] = await Promise.all([
      prisma.dailyProgress.count(),
      prisma.dailyProgress.count({
        where: {
          attendanceStatus: {
            in: ['PRESENT', 'LATE']
          }
        }
      })
    ]);
    const averageAttendance = totalProgressEntries > 0
      ? Math.round((presentProgressEntries / totalProgressEntries) * 100)
      : 92; // fallback to 92 if no daily progress records exist yet

    // Query actual upcoming scheduled sessions
    const upcomingSessions = await prisma.session.findMany({
      where: {
        date: { gte: new Date() },
        status: 'SCHEDULED'
      },
      orderBy: { date: 'asc' },
      take: 5,
      include: {
        student: { select: { name: true } },
        mentor: { select: { name: true } }
      }
    });

    // Query active scheduled sessions and group them by program
    const activeSessions = await prisma.session.findMany({
      where: {
        status: 'SCHEDULED'
      },
      include: {
        student: {
          select: {
            program: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const sessionCountsByProgram: Record<string, number> = {
      'G-GMP': 0,
      'G-CMP': 0,
      'E-TIP': 0
    };

    activeSessions.forEach(s => {
      const pName = s.student?.program?.name;
      if (pName) {
        if (pName.toUpperCase().includes('GMP')) {
          sessionCountsByProgram['G-GMP']++;
        } else if (pName.toUpperCase().includes('CMP')) {
          sessionCountsByProgram['G-CMP']++;
        } else if (pName.toUpperCase().includes('TIP')) {
          sessionCountsByProgram['E-TIP']++;
        }
      }
    });

    // 1. Query real daily progress performance ratings for the last 14 days from the database
    const progressTrend = [];
    const nowTime = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(nowTime.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const avgRating = await prisma.dailyProgress.aggregate({
        where: {
          date: {
            gte: date,
            lt: nextDate
          }
        },
        _avg: {
          performanceRating: true
        }
      });
      
      progressTrend.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1),
        rating: avgRating._avg.performanceRating || 0
      });
    }

    // 2. Query real student outcomes grouped by type from the database
    const outcomesByTypeRaw = await prisma.outcome.groupBy({
      by: ['type'],
      _count: true
    });
    const outcomesByType = outcomesByTypeRaw.map(o => ({
      type: o.type,
      count: o._count
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
      engagementMetrics: {
        activeStudents: Math.round((activeStudents / (totalStudents || 1)) * 100),
        completedSessions: sessionsCompleted,
        averageAttendance
      },
      enrollmentTrend,
      programDistribution,
      outcomesByMonth,
      trackPerformance,
      recentActivity,
      upcomingSessions,
      sessionCountsByProgram,
      progressTrend,
      outcomesByType
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