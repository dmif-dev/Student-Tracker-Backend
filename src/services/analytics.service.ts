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

  async generateInsights(program?: ProgramType) {
    const where: any = {};
    if (program) where.program = program;

    const [
      totalOutcomes,
      outcomesByType,
      outcomesByStatus,
      topStudents,
      topMentors,
      monthlyGrowth
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
      trends: monthlyGrowth,
      recommendations: this.generateRecommendations(monthlyGrowth)
    };
  }

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