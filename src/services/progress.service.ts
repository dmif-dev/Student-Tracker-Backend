// backend/src/services/progress.service.ts
import { prisma } from '../lib/prisma.js';
import { AttendanceStatus } from '@prisma/client';

export class ProgressService {
  canAccessStudent(user: any, studentId: string): boolean {
    if (!user) return false;
    
    // Admin can access all
    if (user.role === 'ADMIN') return true;
    
    // Mentor can access their students
    if (user.role === 'MENTOR' && user.mentor) {
      return user.mentor.assignedStudents?.some((s: any) => s.id === studentId) || false;
    }
    
    // Student can access their own
    if (user.role === 'STUDENT' && user.student) {
      return user.student.id === studentId;
    }
    
    return false;
  }

  async checkAndGenerateWeeklyReport(studentId: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const progress = await prisma.dailyProgress.findMany({
      where: {
        studentId,
        date: { gte: weekStart, lte: weekEnd }
      }
    });

    // Generate report on Saturday (day 6) if not already generated
    if (now.getDay() === 6 && progress.length > 0) {
      const existingReport = await prisma.weeklyReport.findFirst({
        where: {
          studentId,
          weekStart: { gte: weekStart }
        }
      });

      if (!existingReport) {
        const topicsCovered = progress.flatMap(p => p.topicsCovered);
        const uniqueTopics = [...new Set(topicsCovered)];
        const attendanceRate = (progress.filter(p => p.attendanceStatus === 'PRESENT').length / progress.length) * 100;
        const performanceAvg = progress.reduce((sum, p) => sum + (p.performanceRating || 0), 0) / progress.length;

        await prisma.weeklyReport.create({
          data: {
            studentId,
            weekStart,
            weekEnd,
            summary: `Attended ${Math.round(attendanceRate)}% of sessions. Topics: ${uniqueTopics.join(', ')}`,
            strengths: [],
            areasForImprovement: [],
            attendanceRate,
            topicsCovered: uniqueTopics,
            performanceAvg: performanceAvg || null,
            generatedAt: new Date()
          }
        });
      }
    }
  }

  async calculateStudentStats(studentId: string) {
    const [totalEntries, attendance, performance, weeklyReports] = await Promise.all([
      prisma.dailyProgress.count({ where: { studentId } }),
      prisma.dailyProgress.groupBy({
        by: ['attendanceStatus'],
        where: { studentId },
        _count: true
      }),
      prisma.dailyProgress.aggregate({
        where: { studentId, performanceRating: { not: null } },
        _avg: { performanceRating: true },
        _min: { performanceRating: true },
        _max: { performanceRating: true }
      }),
      prisma.weeklyReport.count({ where: { studentId } })
    ]);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { progress: true }
    });

    // Create a map of attendance status counts
    const attendanceMap: Record<string, number> = {};
    attendance.forEach(item => {
      attendanceMap[item.attendanceStatus] = item._count;
    });

    return {
      totalEntries,
      attendance: {
        present: attendanceMap['PRESENT'] || 0,
        absent: attendanceMap['ABSENT'] || 0,
        late: attendanceMap['LATE'] || 0,
        rate: totalEntries > 0 
          ? ((attendanceMap['PRESENT'] || 0) / totalEntries) * 100 
          : 0
      },
      performance: {
        average: performance._avg.performanceRating || 0,
        min: performance._min.performanceRating || 0,
        max: performance._max.performanceRating || 0
      },
      weeklyReports,
      currentProgress: student?.progress || 0
    };
  }

  async calculateTrends(studentId: string, months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const progress = await prisma.dailyProgress.findMany({
      where: {
        studentId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    // Group by month
    const monthlyData = progress.reduce((acc: any, curr) => {
      const monthKey = curr.date.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          entries: 0,
          performanceSum: 0,
          performanceCount: 0
        };
      }
      acc[monthKey].entries++;
      if (curr.performanceRating) {
        acc[monthKey].performanceSum += curr.performanceRating;
        acc[monthKey].performanceCount++;
      }
      return acc;
    }, {});

    const trends = Object.values(monthlyData).map((data: any) => ({
      month: data.month,
      entries: data.entries,
      averagePerformance: data.performanceCount > 0 
        ? data.performanceSum / data.performanceCount 
        : null
    }));

    return trends;
  }
}