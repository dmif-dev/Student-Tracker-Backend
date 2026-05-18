// backend/src/services/report-generation.service.ts
import { prisma } from '../lib/prisma.js';
import { AttendanceStatus, DailyProgress, WeeklyReport } from '@prisma/client';

export class ReportGenerationService {
  getCurrentWeekStart(): Date {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  calculateNextRun(frequency: string, startDate: Date): Date {
    const next = new Date(startDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setDate(next.getDate() + 7);
    }

    return next;
  }

  async generateWeeklyReport(studentId: string, weekStart?: Date) {
    const targetWeekStart = weekStart || this.getCurrentWeekStart();
    const { start, end } = this.getWeekRange(targetWeekStart);

    // Check if report already exists
    const existingReport = await prisma.weeklyReport.findFirst({
      where: {
        studentId,
        weekStart: { gte: start },
        weekEnd: { lte: end }
      }
    });

    if (existingReport) {
      throw new Error('Report already exists for this week');
    }

    // Get all progress for the week
    const progress = await prisma.dailyProgress.findMany({
      where: {
        studentId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'asc' }
    });

    if (progress.length === 0) {
      throw new Error('No progress data for this week');
    }

    // Calculate metrics
    const topicsCovered = [...new Set(progress.flatMap(p => p.topicsCovered))];
    const attendanceCount = progress.filter(p => p.attendanceStatus === 'PRESENT').length;
    const attendanceRate = (attendanceCount / progress.length) * 100;

    const performanceRatings = progress
      .filter(p => p.performanceRating)
      .map(p => p.performanceRating!);

    const performanceAvg = performanceRatings.length > 0
      ? performanceRatings.reduce((a, b) => a + b, 0) / performanceRatings.length
      : null;

    // Identify strengths and areas for improvement
    const strengths = this.identifyStrengths(progress);
    const areasForImprovement = this.identifyAreasForImprovement(progress);

    // Generate summary
    const summary = this.generateSummary(
      progress.length,
      attendanceCount,
      topicsCovered,
      performanceAvg
    );

    // Create report
    const report = await prisma.weeklyReport.create({
      data: {
        studentId,
        weekStart: start,
        weekEnd: end,
        summary,
        strengths,
        areasForImprovement,
        attendanceRate,
        topicsCovered,
        performanceAvg,
        generatedAt: new Date()
      },
      include: {
        student: {
          select: {
            name: true,
            program: true,
            trackId: true,
            mentor: {
              select: { name: true }
            }
          }
        }
      }
    });

    return report;
  }

  async generateCustomReport(config: any) {
    const { name, dateRange, programs = [], studentIds = [], mentorIds = [], includeOutcomes = false } = config;

    const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(0);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    // Fetch students
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        user: { select: { email: true } },
        program: { select: { name: true } },
        track: { select: { name: true } },
        mentor: { select: { name: true } },
        dailyProgress: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        outcomes: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        },
      }
    });

    // Fetch mentors
    const mentors = await prisma.mentor.findMany({
      where: { id: { in: mentorIds } },
      include: {
        user: { select: { email: true } },
        assignedStudents: true,
        sessions: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    });

    const studentsData = students.map(s => {
      const attendanceCount = s.dailyProgress.filter(p => p.attendanceStatus === 'PRESENT').length;
      const totalDays = s.dailyProgress.length;
      const attendanceRate = totalDays > 0 ? (attendanceCount / totalDays) * 100 : 0;

      const patents = s.outcomes.filter(o => o.type === 'PATENT').length;
      const papers = s.outcomes.filter(o => o.type === 'PAPER').length;
      const startups = s.outcomes.filter(o => o.type === 'STARTUP').length;
      const certifications = s.outcomes.filter(o => o.type === 'CERTIFICATION').length;
      const projectsCompleted = s.outcomes.filter(o => o.type === 'PROJECT').length;

      return {
        id: s.id,
        name: s.name,
        email: s.user?.email || '',
        program: s.program?.name || '',
        track: s.track?.name || '',
        mentor: s.mentor?.name || 'Not assigned',
        progress: s.progress,
        attendance: Math.round(attendanceRate),
        activities: s.dailyProgress.length,
        assignments: 0,
        patents,
        papers,
        startups,
        certifications,
        projectsCompleted,
        modulesCompleted: 0
      };
    });

    const mentorsData = mentors.map(m => ({
      id: m.id,
      name: m.name,
      email: m.user?.email || '',
      programs: m.programs.map(p => p.toString()),
      expertise: m.expertise,
      students: m.assignedStudents.length,
      sessions: m.sessions.length
    }));

    // Outcomes summary
    let gGMPOutcomes = 0, pcpCertificationsCount = 0;
    const gGMP = includeOutcomes ? { patents: 0, papers: 0, startups: 0, byMonth: [] } : undefined;
    const pcp = includeOutcomes ? { certifications: 0, byLevel: { associate: 0, specialist: 0, professional: 0 } } : undefined;

    if (includeOutcomes) {
      students.forEach(s => {
        if (s.program?.name === 'G-GMP' && gGMP) {
          gGMP.patents += s.outcomes.filter(o => o.type === 'PATENT').length;
          gGMP.papers += s.outcomes.filter(o => o.type === 'PAPER').length;
          gGMP.startups += s.outcomes.filter(o => o.type === 'STARTUP').length;
          gGMPOutcomes += s.outcomes.length;
        }
        if (s.program?.name === 'PCP' && pcp) {
          const certs = s.outcomes.filter(o => o.type === 'CERTIFICATION');
          pcp.certifications += certs.length;
          pcpCertificationsCount += certs.length;
        }
      });
    }

    const gGMPStudents = studentsData.filter(s => s.program === 'G-GMP').length;
    const pcpStudents = studentsData.filter(s => s.program === 'PCP').length;

    return {
      reportName: name || 'Custom Report',
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || { start: '', end: '' },
      programs: programs.length > 0 ? programs : ['All Programs'],
      students: studentsData,
      mentors: mentorsData,
      outcomes: { gGMP, pcp },
      summary: {
        totalStudents: studentsData.length,
        totalMentors: mentorsData.length,
        gGMPStudents,
        gCMPStudents: studentsData.filter(s => s.program === 'G-CMP').length,
        eTIPStudents: studentsData.filter(s => s.program === 'E-TIP').length,
        pcpStudents,
        totalOutcomes: gGMPOutcomes + pcpCertificationsCount,
        averageProgress: studentsData.length > 0 ? studentsData.reduce((acc, s) => acc + s.progress, 0) / studentsData.length : 0,
        averageAttendance: studentsData.length > 0 ? studentsData.reduce((acc, s) => acc + (s.attendance || 0), 0) / studentsData.length : 0,
        totalActivities: studentsData.reduce((acc, s) => acc + (s.activities || 0), 0),
        completedAssignments: 0
      }
    };
  }

  async generateProgramReport(programId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      gte: startDate,
      lte: endDate
    } : undefined;

    const students = await prisma.student.findMany({
      where: { programId },
      include: {
        dailyProgress: {
          where: dateFilter ? { date: dateFilter } : {},
          orderBy: { date: 'asc' }
        },
        outcomes: {
          where: dateFilter ? { date: dateFilter } : {}
        },
        mentor: {
          select: { name: true }
        }
      }
    });

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'ACTIVE').length;

    const totalProgress = students.reduce((sum, s) => sum + s.progress, 0);
    const averageProgress = totalStudents > 0 ? totalProgress / totalStudents : 0;

    const totalOutcomes = students.reduce((sum, s) => sum + s.outcomes.length, 0);

    const outcomesByType = students.reduce((acc: any, student) => {
      student.outcomes.forEach(outcome => {
        acc[outcome.type] = (acc[outcome.type] || 0) + 1;
      });
      return acc;
    }, {});

    // Use trackId instead of track
    const progressByTrack = students.reduce((acc: any, student) => {
      if (!acc[student.trackId]) {
        acc[student.trackId] = {
          trackId: student.trackId,
          count: 0,
          progressSum: 0,
          students: []
        };
      }
      acc[student.trackId].count++;
      acc[student.trackId].progressSum += student.progress;
      acc[student.trackId].students.push({
        name: student.name,
        progress: student.progress
      });
      return acc;
    }, {});

    const trackAverages = Object.values(progressByTrack).map((data: any) => ({
      trackId: data.trackId,
      averageProgress: data.progressSum / data.count,
      studentCount: data.count,
      students: data.students
    }));

    // Calculate daily activity
    const dailyActivity = students.flatMap(s => s.dailyProgress).reduce((acc: any, curr) => {
      const dateStr = curr.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, entries: 0, students: new Set() };
      }
      acc[dateStr].entries++;
      acc[dateStr].students.add(curr.studentId);
      return acc;
    }, {});

    const activityTimeline = Object.values(dailyActivity).map((day: any) => ({
      date: day.date,
      entries: day.entries,
      uniqueStudents: day.students.size
    }));

    return {
      programId,
      generatedAt: new Date(),
      dateRange: startDate && endDate ? { startDate, endDate } : null,
      summary: {
        totalStudents,
        activeStudents,
        completionRate: totalStudents > 0
          ? (students.filter(s => s.status === 'COMPLETED').length / totalStudents) * 100
          : 0,
        averageProgress,
        totalOutcomes,
        totalEntries: students.reduce((sum, s) => sum + s.dailyProgress.length, 0)
      },
      outcomes: outcomesByType,
      tracks: trackAverages,
      activityTimeline,
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        progress: s.progress,
        mentor: s.mentor?.name,
        outcomes: s.outcomes.length,
        entries: s.dailyProgress.length
      }))
    };
  }

  private identifyStrengths(progress: any[]): string[] {
    const strengths: string[] = [];

    // Check for high performance
    const highPerformanceDays = progress.filter(p =>
      p.performanceRating && p.performanceRating >= 8
    );

    if (highPerformanceDays.length >= 3) {
      strengths.push('Consistently high performance');
    }

    // Check for perfect attendance
    if (progress.every(p => p.attendanceStatus === 'PRESENT')) {
      strengths.push('Perfect attendance');
    }

    // Check topic variety
    const uniqueTopics = new Set(progress.flatMap(p => p.topicsCovered));
    if (uniqueTopics.size >= 5) {
      strengths.push('Excellent topic coverage');
    }

    // Check for improvement trend
    const ratings = progress
      .filter(p => p.performanceRating)
      .map(p => p.performanceRating);

    if (ratings.length >= 3 && ratings[ratings.length - 1] > ratings[0]) {
      strengths.push('Shows improvement over time');
    }

    return strengths;
  }

  private identifyAreasForImprovement(progress: any[]): string[] {
    const areas: string[] = [];

    // Check attendance issues
    const absentCount = progress.filter(p => p.attendanceStatus === 'ABSENT').length;
    if (absentCount > 0) {
      areas.push(`${absentCount} absent days this week`);
    }

    // Check low performance
    const lowPerformanceDays = progress.filter(p =>
      p.performanceRating && p.performanceRating < 5
    );

    if (lowPerformanceDays.length > 0) {
      areas.push('Some days with low performance ratings');
    }

    // Check inconsistent progress
    if (progress.some(p => p.topicsCovered.length === 0)) {
      areas.push('Some days with no topics covered');
    }

    // Check for declining trend
    const ratings = progress
      .filter(p => p.performanceRating)
      .map(p => p.performanceRating);

    if (ratings.length >= 3 && ratings[ratings.length - 1] < ratings[0]) {
      areas.push('Performance showing declining trend');
    }

    return areas;
  }

  private generateSummary(
    totalDays: number,
    attendedDays: number,
    topics: string[],
    avgPerformance: number | null
  ): string {
    const attendanceRate = Math.round((attendedDays / totalDays) * 100);

    let summary = `Attended ${attendedDays} of ${totalDays} days (${attendanceRate}% attendance). `;

    if (topics.length > 0) {
      summary += `Covered ${topics.length} topics: ${topics.join(', ')}. `;
    }

    if (avgPerformance) {
      summary += `Average performance rating: ${avgPerformance.toFixed(1)}/10.`;
    }

    return summary;
  }

  async generateReport(studentId: string, weekProgress: DailyProgress[]): Promise<Partial<WeeklyReport>> {
    const summaryData = generateWeeklySummary(weekProgress);

    return {
      studentId,
      ...summaryData,
      generatedAt: new Date(),
    };
  }

  // You can add your next-run calculation here
  calculateNextRun(frequency: string, startDate: Date): Date {
    const nextRun = new Date(startDate);
    if (frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    return nextRun;
  }

}