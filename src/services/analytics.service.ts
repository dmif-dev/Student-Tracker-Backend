// backend/src/services/analytics.service.ts
import { prisma } from '../lib/prisma.js';
import { ProgramType } from '@prisma/client';

export class AnalyticsService {
  async getDashboardStats(userId: string, userRole: string) {
    let stats: any = {};

    if (userRole === 'ADMIN') {
      stats = await this.getAdminDashboard();
    } else if (userRole === 'MENTOR') {
      stats = await this.getMentorDashboard(userId);
    } else if (userRole === 'STUDENT') {
      stats = await this.getStudentDashboard(userId);
    }

    return stats;
  }

  private async getAdminDashboard() {
    const [
      totalStudents,
      totalMentors,
      totalOutcomes,
      recentOutcomes,
      programStats,
      outcomeTrends
    ] = await Promise.all([
      prisma.student.count(),
      prisma.mentor.count(),
      prisma.outcome.count(),
      prisma.outcome.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true } },
          mentor: { select: { name: true } }
        }
      }),
      this.getProgramStats(),
      this.getOutcomeTrends()
    ]);

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeStudents = await prisma.student.count({
      where: { lastActive: { gte: thirtyDaysAgo } }
    });

    const activeMentors = await prisma.mentor.count({
      where: {
        sessions: {
          some: {
            date: { gte: thirtyDaysAgo }
          }
        }
      }
    });

    return {
      overview: {
        totalStudents,
        totalMentors,
        totalOutcomes,
        activeStudents,
        activeMentors,
        studentMentorRatio: totalMentors > 0 ? (totalStudents / totalMentors).toFixed(1) : 0
      },
      programs: programStats,
      trends: outcomeTrends,
      recentActivity: recentOutcomes.map(o => ({
        id: o.id,
        type: 'outcome',
        title: o.title,
        student: o.student?.name,
        mentor: o.mentor?.name,
        date: o.createdAt
      }))
    };
  }

  private async getMentorDashboard(userId: string) {
    const mentor = await prisma.mentor.findUnique({
      where: { userId },
      include: {
        assignedStudents: true
      }
    });

    if (!mentor) return null;

    const [
      totalStudents,
      activeStudents,
      totalSessions,
      completedSessions,
      outcomes,
      recentSessions
    ] = await Promise.all([
      prisma.student.count({ where: { mentorId: mentor.id } }),
      prisma.student.count({ 
        where: { 
          mentorId: mentor.id,
          lastActive: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      }),
      prisma.session.count({ where: { mentorId: mentor.id } }),
      prisma.session.count({ where: { mentorId: mentor.id, status: 'COMPLETED' } }),
      prisma.outcome.count({ 
        where: { 
          mentorId: mentor.id,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      }),
      prisma.session.findMany({
        where: { mentorId: mentor.id },
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          student: { select: { name: true } }
        }
      })
    ]);

    // Student progress distribution
    const studentProgress = mentor.assignedStudents.reduce((acc: any, student) => {
      const range = this.getProgressRange(student.progress);
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {});

    return {
      overview: {
        totalStudents,
        activeStudents,
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        recentOutcomes: outcomes
      },
      students: {
        distribution: studentProgress,
        list: mentor.assignedStudents.map(s => ({
          id: s.id,
          name: s.name,
          progress: s.progress,
          status: s.status
        }))
      },
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        student: s.student.name,
        date: s.date,
        status: s.status
      }))
    };
  }

  private async getStudentDashboard(userId: string) {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        mentor: true,
        program: true,
        track: true
      }
    });

    if (!student) return null;

    const [
      totalSessions,
      completedSessions,
      upcomingSessions,
      outcomes,
      weeklyReports
    ] = await Promise.all([
      prisma.session.count({ where: { studentId: student.id } }),
      prisma.session.count({ where: { studentId: student.id, status: 'COMPLETED' } }),
      prisma.session.count({ 
        where: { 
          studentId: student.id,
          date: { gte: new Date() },
          status: 'SCHEDULED'
        } 
      }),
      prisma.outcome.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 5
      }),
      prisma.weeklyReport.findMany({
        where: { studentId: student.id },
        orderBy: { weekStart: 'desc' },
        take: 5
      })
    ]);

    // Progress over time
    const progressHistory = await this.getStudentProgressHistory(student.id);

    return {
      profile: {
        name: student.name,
        program: student.program?.name,
        track: student.track?.name,
        mentor: student.mentor?.name,
        progress: student.progress
      },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        upcoming: upcomingSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
      },
      outcomes: outcomes.map(o => ({
        id: o.id,
        title: o.title,
        type: o.type,
        status: o.status,
        date: o.date
      })),
      reports: weeklyReports,
      progressHistory
    };
  }

  private async getProgramStats() {
    const programs = await prisma.program.findMany({
      include: {
        students: true,
        tracks: true
      }
    });

    return programs.map(program => ({
      id: program.id,
      name: program.name,
      totalStudents: program.students.length,
      totalTracks: program.tracks.length,
      averageProgress: program.students.length > 0
        ? program.students.reduce((sum, s) => sum + s.progress, 0) / program.students.length
        : 0
    }));
  }

  private async getOutcomeTrends() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const outcomes = await prisma.outcome.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    const monthlyData = outcomes.reduce((acc: any, outcome) => {
      const monthKey = outcome.createdAt.toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, total: 0, byType: {} };
      }
      acc[monthKey].total++;
      acc[monthKey].byType[outcome.type] = (acc[monthKey].byType[outcome.type] || 0) + 1;
      return acc;
    }, {});

    return Object.values(monthlyData);
  }

  private async getStudentProgressHistory(studentId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const reports = await prisma.weeklyReport.findMany({
      where: {
        studentId,
        weekStart: { gte: sixMonthsAgo }
      },
      orderBy: { weekStart: 'asc' }
    });

    return reports.map(report => ({
      week: report.weekStart.toISOString().slice(0, 10),
      attendance: report.attendanceRate,
      performance: report.performanceAvg,
      topics: report.topicsCovered.length
    }));
  }

  private getProgressRange(progress: number): string {
    if (progress < 25) return '0-25%';
    if (progress < 50) return '25-50%';
    if (progress < 75) return '50-75%';
    return '75-100%';
  }

  // My code to match data frontend is expecting from backend

  async generateInsights(programType?: string) {
  const where: any = {};
  if (programType && programType !== 'all') {
    where.program = { name: programType.toUpperCase() }; 
  }

  // Define the 30-day window for active status
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    activeStudents,
    totalMentors,
    totalOutcomes,
    programs,
    outcomeTrendData
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { lastActive: { gte: thirtyDaysAgo } } }),
    prisma.mentor.count(),
    prisma.outcome.count({ where }),
    prisma.program.findMany({
      include: {
        students: true,
        tracks: true // Ensure tracks are included
      }
    }),
    this.getMonthlyGrowth(where)
  ]);

  // 1. Correct mapping for programEngagement (Must be an ARRAY)
  const programEngagement = programs.map(p => ({
    program: p.name,
    activeStudents: p.students.filter(s => s.lastActive >= thirtyDaysAgo).length,
    avgProgress: p.students.length > 0 
      ? p.students.reduce((acc, s) => acc + s.progress, 0) / p.students.length 
      : 0,
    completionRate: 85, // You can calculate this based on status === 'COMPLETED'
    hasMentors: p.name !== 'PCP',
    hasOutcomes: p.name === 'G-GMP'
  }));

  // 2. Correct mapping for trackProgress (Must be an ARRAY)
  const trackProgress = programs.flatMap(p => 
    p.tracks.map(t => ({
      program: p.name,
      track: t.name,
      progress: 70, // Map from your actual track progress logic
      students: 10, // Map from your student count per track
      hasMentor: p.name !== 'PCP',
      completionRate: 75
    }))
  );

  return {
    summary: {
      totalStudents,
      activeStudents,
      totalMentors,
      totalOutcomes,
      pcpStudents: await prisma.student.count({ where: { program: { name: 'PCP' } } }),
      mentorLedStudents: await prisma.student.count({ where: { program: { name: { in: ['G-GMP', 'G-CMP', 'E-TIP'] } } } }),
      programsWithOutcomes: programs.filter(p => p.name === 'G-GMP').length
    },
    // FIX: Changed from Object to Array to match frontend interface
    programEngagement: programEngagement, 
    
    // FIX: Added missing property to prevent "undefined" error
    trackProgress: trackProgress,

    programData: programs.map(p => ({
      id: p.id,
      name: p.name,
      // Default icon/color to avoid frontend crashes if config is missing
      color: p.name === 'G-GMP' ? '#8B5CF6' : '#10B981', 
      stats: {
        totalStudents: p.students.length,
        activeStudents: p.students.filter(s => s.lastActive >= thirtyDaysAgo).length,
        totalMentors: 0, 
        completionRate: 85,
        averageProgress: p.students.length > 0 
          ? p.students.reduce((acc, s) => acc + s.progress, 0) / p.students.length 
          : 0
      }
    })),

    // Ensure this matches: Array<{ month: string; total: number; pcp: number; mentorLed: number }>
    enrollmentTrend: outcomeTrendData.map((item: any) => ({
      month: item.month,
      total: item.count,
      pcp: Math.floor(item.count * 0.3), // Mocking split or calculate properly
      mentorLed: Math.floor(item.count * 0.7)
    })),

    mentorStats: {
        totalMentors,
        activeMentors: totalMentors,
        averageStudentsPerMentor: totalMentors > 0 ? totalStudents / totalMentors : 0,
        mentorsByProgram: [],
        totalSessionsPerMonth: 0
    },
    
    pcpStats: { 
      totalStudents: 0, 
      activeStudents: 0, 
      completedStudents: 0, 
      averageProgress: 0, 
      completionRate: 0, 
      moduleProgress: []
    },

    outcomeStats: {
        totalPatents: await prisma.outcome.count({ where: { ...where, type: 'PATENT' } }),
        totalPapers: await prisma.outcome.count({ where: { ...where, type: 'PAPER' } }),
        totalStartups: await prisma.outcome.count({ where: { ...where, type: 'STARTUP' } }),
        byMonth: outcomeTrendData.map((item: any) => ({
            month: item.month,
            patents: 2, // Map actual counts here
            papers: 3,
            startups: 1
        }))
    }
  };
}
  
/*
  async generateInsights(program?: ProgramType) {
    const where: any = {};
    if (program) where.program = program;

    const [
      totalOutcomes,
      outcomesByType,
      outcomesByStatus,
      topStudents,
      topMentors,
      monthlyGrowth,
      programStats        // added this to match with the integrated frontend
    ] = await Promise.all([
      prisma.outcome.count({ where }),
      prisma.outcome.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.outcome.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      this.getTopStudents(10, where),
      this.getTopMentors(10, where),
      this.getMonthlyGrowth(where)
    ]);

    return {
      summary: {
        total: totalOutcomes,
        byType: outcomesByType.reduce((acc, curr) => ({ ...acc, [curr.type]: curr._count }), {}),
        byStatus: outcomesByStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count }), {})
      },
      topPerformers: {
        students: topStudents,
        mentors: topMentors
      },
      programEngagement: programStats,
      trends: monthlyGrowth,
      recommendations: this.generateRecommendations(monthlyGrowth)
    };
  }
    */

  private async getTopStudents(limit: number, where: any) {
    const students = await prisma.student.findMany({
      where: where.program ? { program: where.program } : {},
      include: {
        outcomes: {
          where: where.date ? { date: where.date } : {}
        }
      },
      take: limit
    });

    return students
      .map(s => ({
        id: s.id,
        name: s.name,
        outcomeCount: s.outcomes.length,
        progress: s.progress
      }))
      .sort((a, b) => b.outcomeCount - a.outcomeCount)
      .slice(0, limit);
  }

  private async getTopMentors(limit: number, where: any) {
    const mentors = await prisma.mentor.findMany({
      include: {
        outcomes: {
          where: where.date ? { date: where.date } : {}
        },
        assignedStudents: true
      },
      take: limit
    });

    return mentors
      .map(m => ({
        id: m.id,
        name: m.name,
        outcomeCount: m.outcomes.length,
        studentCount: m.assignedStudents.length,
        rating: m.rating
      }))
      .sort((a, b) => b.outcomeCount - a.outcomeCount)
      .slice(0, limit);
  }

  private async getMonthlyGrowth(where: any) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const outcomes = await prisma.outcome.findMany({
      where: {
        ...where,
        date: { gte: sixMonthsAgo }
      },
      orderBy: { date: 'asc' }
    });

    const monthlyData = outcomes.reduce((acc: any, outcome) => {
      const monthKey = outcome.date.toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, count: 0 };
      }
      acc[monthKey].count++;
      return acc;
    }, {});

    return Object.values(monthlyData);
  }

  private generateRecommendations(monthlyGrowth: any[]): string[] {
    const recommendations = [];

    if (monthlyGrowth.length >= 2) {
      const lastMonth = monthlyGrowth[monthlyGrowth.length - 1];
      const previousMonth = monthlyGrowth[monthlyGrowth.length - 2];

      if (lastMonth.count < previousMonth.count) {
        recommendations.push('Consider increasing mentor engagement to boost outcome generation');
      } else if (lastMonth.count > previousMonth.count * 1.5) {
        recommendations.push('Great growth! Consider showcasing success stories to motivate others');
      }
    }

    return recommendations;
  }

  async exportAnalytics(format: 'csv' | 'json', filters: any) {
    const data = await this.generateInsights(filters.program);

    if (format === 'json') {
      return data;
    }

    // Convert to CSV format
    const csvRows = [];
    
    // Summary
    csvRows.push('Summary');
    csvRows.push(`Total Outcomes,${data.summary.total}`);
    csvRows.push('');
    
    // By Type
    csvRows.push('Outcomes by Type');
    Object.entries(data.summary.byType).forEach(([type, count]) => {
      csvRows.push(`${type},${count}`);
    });
    csvRows.push('');
    
    // Top Students
    csvRows.push('Top Students');
    csvRows.push('Name,Outcome Count,Progress');
    data.topPerformers.students.forEach((s: any) => {
      csvRows.push(`${s.name},${s.outcomeCount},${s.progress}%`);
    });

    return csvRows.join('\n');
  }
}