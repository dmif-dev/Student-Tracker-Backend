// backend/src/services/report-generation.service.ts
import { prisma } from '../lib/prisma.js';
import { AttendanceStatus } from '@prisma/client';
import { ExportService } from './export.service.js';
import { uploadToSupabase, supabaseAdmin, STORAGE_BUCKET } from '../lib/supabaseStorage.js';
import path from 'path';

const exportService = new ExportService();

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

    // Fetch student info with program and track names for the PDF
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        program: true,
        track: true,
        mentor: true
      }
    });

    // Prepare data for the PDF
    const reportData = {
      student: {
        name: student?.name || 'N/A',
        program: student?.program?.name || 'N/A',
        track: student?.track?.name || 'N/A',
        mentor: student?.mentor ? { name: student.mentor.name } : null
      },
      weekStart: start,
      weekEnd: end,
      summary,
      strengths,
      areasForImprovement,
      attendanceRate,
      topicsCovered,
      performanceAvg
    };

    // Generate PDF buffer in memory
    const pdfBuffer = await exportService.exportReportToBuffer(reportData);

    // Upload PDF buffer to 'Reports' storage bucket
    const fileName = `weekly-report-${studentId}-${start.getTime()}.pdf`;
    const storagePath = await uploadToSupabase(pdfBuffer, fileName, 'application/pdf', 'Reports');

    // Retrieve public URL from 'Reports' bucket
    let publicUrl = '';
    if (process.env.SUPABASE_SERVICE_KEY?.trim()) {
      const { data } = supabaseAdmin.storage.from('Reports').getPublicUrl(storagePath);
      publicUrl = data.publicUrl;
    } else {
      // Local development fallback
      const serverPort = process.env.PORT || 4000;
      publicUrl = `http://localhost:${serverPort}/uploads/${path.basename(storagePath)}`;
    }

    // Create report in database with fileUrl
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
        fileUrl: publicUrl,
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
    const { studentIds, startDate, endDate, includeTopics = true } = config;

    const where: any = {
      studentId: { in: studentIds },
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    const progress = await prisma.dailyProgress.findMany({
      where,
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
      },
      orderBy: [
        { studentId: 'asc' },
        { date: 'asc' }
      ]
    });

    // Group by student
    const studentReports = progress.reduce((acc: any, curr) => {
      if (!acc[curr.studentId]) {
        acc[curr.studentId] = {
          studentId: curr.studentId,
          studentName: curr.student.name,
          program: curr.student.program,
          trackId: curr.student.trackId,
          mentorName: curr.student.mentor?.name,
          entries: [],
          topics: new Set(),
          totalPerformance: 0,
          performanceCount: 0,
          attendance: { PRESENT: 0, ABSENT: 0, LATE: 0 }
        };
      }

      const report = acc[curr.studentId];
      report.entries.push(curr);
      
      if (includeTopics) {
        curr.topicsCovered.forEach((topic: string) => report.topics.add(topic));
      }
      
      if (curr.performanceRating) {
        report.totalPerformance += curr.performanceRating;
        report.performanceCount++;
      }
      
      report.attendance[curr.attendanceStatus]++;

      return acc;
    }, {});

    // Calculate averages and convert Sets to Arrays
    const result = Object.values(studentReports).map((report: any) => ({
      ...report,
      topics: Array.from(report.topics),
      averagePerformance: report.performanceCount > 0 
        ? report.totalPerformance / report.performanceCount 
        : null,
      totalEntries: report.entries.length,
      attendanceRate: report.entries.length > 0
        ? (report.attendance.PRESENT / report.entries.length) * 100
        : 0
    }));

    return {
      generatedAt: new Date(),
      dateRange: { startDate, endDate },
      totalStudents: result.length,
      students: result
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
}