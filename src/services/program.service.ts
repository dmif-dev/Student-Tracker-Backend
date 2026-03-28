// backend/src/services/program.service.ts
import { prisma } from '../lib/prisma.js';
import { ProgramType } from '@prisma/client';

export class ProgramService {
  async calculateProgramMetrics(programId: string) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        tracks: {
          include: {
            students: true
          }
        },
        students: true
      }
    });

    if (!program) return null;

    const totalStudents = program.students.length;
    const activeStudents = program.students.filter(s => s.status === 'ACTIVE').length;
    const completedStudents = program.students.filter(s => s.status === 'COMPLETED').length;
    
    const averageProgress = totalStudents > 0
      ? program.students.reduce((sum, s) => sum + s.progress, 0) / totalStudents
      : 0;

    const trackMetrics = program.tracks.map(track => ({
      trackId: track.id,
      trackName: track.name,
      studentCount: track.students.length,
      averageProgress: track.students.length > 0
        ? track.students.reduce((sum, s) => sum + s.progress, 0) / track.students.length
        : 0
    }));

    return {
      totalStudents,
      activeStudents,
      completedStudents,
      averageProgress,
      completionRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0,
      tracks: trackMetrics
    };
  }

  async calculateDetailedMetrics(programId: string) {
    const metrics = await this.calculateProgramMetrics(programId);
    if (!metrics) return null;

    // Get outcomes for the program
    const outcomes = await prisma.outcome.groupBy({
      by: ['type'],
      where: {
        student: {
          programId: programId
        }
      },
      _count: true
    });

    // Get monthly enrollment trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollments = await prisma.student.groupBy({
      by: ['joinDate'],
      where: {
        programId: programId,
        joinDate: { gte: sixMonthsAgo }
      },
      _count: true
    });

    // Get mentor statistics
    const prog = await prisma.program.findUnique({ where: { id: programId } });
    const programType = prog?.name.replace('-', '_') as ProgramType;
    const validProgramTypes = ['G_GMP', 'G_CMP', 'E_TIP', 'PCP'];

    let mentorStats: any = { _count: 0, _avg: { rating: 0 } };
    
    if (validProgramTypes.includes(programType)) {
      mentorStats = await prisma.mentor.aggregate({
        where: {
          programs: { has: programType }
        },
        _count: true,
        _avg: {
          rating: true
        }
      });
    }

    return {
      ...metrics,
      outcomes: outcomes.reduce((acc, curr) => ({
        ...acc,
        [curr.type.toLowerCase()]: curr._count
      }), {}),
      enrollmentTrend: enrollments,
      mentorCount: mentorStats._count,
      averageMentorRating: mentorStats._avg?.rating || 0
    };
  }
}