// backend/src/services/outcome.service.ts (Complete fixed version)
import { prisma } from '../lib/prisma.js';
import { OutcomeType, OutcomeStatus, ProgramType } from '@prisma/client';

export class OutcomeService {
  async createOutcome(data: any, userId: string) {
    // Create outcome with analytics
    const outcome = await prisma.$transaction(async (tx) => {
      const newOutcome = await tx.outcome.create({
        data: {
          type: data.type,
          title: data.title,
          description: data.description,
          studentId: data.studentId,
          mentorId: data.mentorId,
          status: data.status || 'PENDING',
          date: new Date(data.date),
          program: data.program,
          metadata: data.metadata || {},
          tags: data.tags || [],
          impact: data.impact,
          externalUrl: data.externalUrl,
          files: data.files || []
        },
        include: {
          student: {
            select: {
              name: true,
              program: true,
              track: true
            }
          },
          mentor: {
            select: {
              name: true
            }
          }
        }
      });

      // Create analytics record
      await tx.outcomeAnalytics.create({
        data: {
          outcomeId: newOutcome.id,
          views: 0,
          downloads: 0,
          citations: 0,
          shares: 0
        }
      });

      // Create achievement for significant outcomes
      if (data.status === 'GRANTED' || data.status === 'PUBLISHED' || data.status === 'COMPLETED') {
        await tx.achievement.create({
          data: {
            studentId: data.studentId,
            type: `${data.type.toLowerCase()}_achieved`,
            title: `Achieved: ${data.title}`,
            description: `Successfully ${this.getAchievementVerb(data.type)} a ${data.type.toLowerCase()}`,
            date: new Date(),
            metadata: {
              outcomeId: newOutcome.id,
              type: data.type,
              status: data.status
            }
          }
        });
      }

      return newOutcome;
    });

    return outcome;
  }

  async getOutcomeById(id: string) {
    const outcome = await prisma.outcome.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            program: true,
            track: true,
            mentor: {
              select: { name: true }
            }
          }
        },
        mentor: {
          select: {
            id: true,
            name: true,
            expertise: true
          }
        },
        analytics: true
      }
    });

    if (outcome && outcome.analytics) {
      // Increment view count
      await prisma.outcomeAnalytics.update({
        where: { outcomeId: id },
        data: {
          views: { increment: 1 },
          lastViewed: new Date()
        }
      });
    }

    return outcome;
  }

  async updateOutcome(id: string, data: any) {
    const outcome = await prisma.outcome.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        updatedAt: new Date()
      },
      include: {
        student: {
          select: { name: true }
        },
        mentor: {
          select: { name: true }
        }
      }
    });

    // Create achievement if status changed to completed/granted
    if (data.status === 'GRANTED' || data.status === 'PUBLISHED' || data.status === 'COMPLETED') {
      await prisma.achievement.create({
        data: {
          studentId: outcome.studentId,
          type: `${outcome.type.toLowerCase()}_achieved`,
          title: `Achieved: ${outcome.title}`,
          description: `Successfully ${this.getAchievementVerb(outcome.type)} a ${outcome.type.toLowerCase()}`,
          date: new Date(),
          metadata: {
            outcomeId: outcome.id,
            type: outcome.type,
            status: outcome.status
          }
        }
      });
    }

    return outcome;
  }

  async deleteOutcome(id: string) {
    return await prisma.$transaction(async (tx) => {
      await tx.outcomeAnalytics.delete({
        where: { outcomeId: id }
      });

      await tx.outcome.delete({
        where: { id }
      });
    });
  }

  async getOutcomes(filters: any) {
    const where: any = {};

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.mentorId) where.mentorId = filters.mentorId;
    if (filters.program) where.program = filters.program;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasEvery: filters.tags };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const outcomes = await prisma.outcome.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            program: true,
            track: true
          }
        },
        mentor: {
          select: {
            name: true
          }
        },
        analytics: true
      },
      orderBy: { date: 'desc' }
    });

    return outcomes;
  }

  async getStudentOutcomeSummary(studentId: string) {
    const outcomes = await prisma.outcome.findMany({
        where: { studentId },
        include: {
        analytics: true  // This returns an array - we need to handle it
        }
    });

    const summary = {
        total: outcomes.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        byProgram: {} as Record<string, number>,
        recent: [] as any[],
        analytics: {
        totalViews: 0,
        totalDownloads: 0,
        totalCitations: 0,
        averageImpact: 0
        }
    };

    outcomes.forEach(outcome => {
        // Count by type
        summary.byType[outcome.type] = (summary.byType[outcome.type] || 0) + 1;
        
        // Count by status
        summary.byStatus[outcome.status] = (summary.byStatus[outcome.status] || 0) + 1;
        
        // Count by program
        summary.byProgram[outcome.program] = (summary.byProgram[outcome.program] || 0) + 1;
        
        // Analytics - FIX: analytics is an array, get the first element
        // Since it's a one-to-one relation, there should be exactly one analytics record per outcome
        if (outcome.analytics && outcome.analytics.length > 0) {
        const analyticsRecord = outcome.analytics[0];
        summary.analytics.totalViews += analyticsRecord.views;
        summary.analytics.totalDownloads += analyticsRecord.downloads;
        summary.analytics.totalCitations += analyticsRecord.citations;
        }

        // Track impact (if numeric)
        if (outcome.impact && !isNaN(Number(outcome.impact))) {
        summary.analytics.averageImpact += Number(outcome.impact);
        }
    });

    // Get recent outcomes
    summary.recent = outcomes
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5)
        .map(o => ({
        id: o.id,
        title: o.title,
        type: o.type,
        status: o.status,
        date: o.date
        }));

    if (outcomes.length > 0) {
        summary.analytics.averageImpact /= outcomes.length;
    }

    return summary;
    }

  async getProgramOutcomeSummary(program: ProgramType, startDate?: Date, endDate?: Date) {
    const where: any = { program };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const outcomes = await prisma.outcome.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            trackId: true,
            track: true
          }
        },
        mentor: {
          select: {
            name: true
          }
        }
      }
    });

    const summary = {
      program,
      total: outcomes.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byTrack: {} as Record<string, number>,
      byMentor: {} as Record<string, number>,
      monthlyTrend: {} as Record<string, number>,
      topStudents: [] as any[],
      recentOutcomes: outcomes.slice(0, 10)
    };

    outcomes.forEach(outcome => {
      // By type
      summary.byType[outcome.type] = (summary.byType[outcome.type] || 0) + 1;
      
      // By status
      summary.byStatus[outcome.status] = (summary.byStatus[outcome.status] || 0) + 1;
      
      // By track - Fixed: Use trackId or track.name
      if (outcome.student?.trackId) {
        const trackName = outcome.student.track?.name || outcome.student.trackId;
        summary.byTrack[trackName] = (summary.byTrack[trackName] || 0) + 1;
      }
      
      // By mentor
      if (outcome.mentor?.name) {
        summary.byMentor[outcome.mentor.name] = (summary.byMentor[outcome.mentor.name] || 0) + 1;
      }

      // Monthly trend
      const monthKey = outcome.date.toISOString().slice(0, 7);
      summary.monthlyTrend[monthKey] = (summary.monthlyTrend[monthKey] || 0) + 1;
    });

    // Get top students
    const studentCounts = outcomes.reduce((acc: any, outcome) => {
      if (outcome.student) {
        const studentId = outcome.studentId;
        if (!acc[studentId]) {
          acc[studentId] = {
            name: outcome.student.name,
            track: outcome.student.track?.name,
            count: 0
          };
        }
        acc[studentId].count++;
      }
      return acc;
    }, {});

    summary.topStudents = Object.values(studentCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    return summary;
  }

  async trackOutcomeInteraction(outcomeId: string, interactionType: 'view' | 'download' | 'citation' | 'share') {
    const updateData: any = {};
    
    switch (interactionType) {
      case 'view':
        updateData.views = { increment: 1 };
        updateData.lastViewed = new Date();
        break;
      case 'download':
        updateData.downloads = { increment: 1 };
        break;
      case 'citation':
        updateData.citations = { increment: 1 };
        break;
      case 'share':
        updateData.shares = { increment: 1 };
        break;
    }

    return await prisma.outcomeAnalytics.update({
      where: { outcomeId },
      data: updateData
    });
  }

  async getOutcomeTrends(program?: ProgramType, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const where: any = {
      date: { gte: startDate }
    };
    if (program) where.program = program;

    const outcomes = await prisma.outcome.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Group by month and type
    const trends: any = {
      labels: [],
      datasets: []
    };

    const monthsMap = new Map();
    const types = new Set<string>();

    outcomes.forEach(outcome => {
      const monthKey = outcome.date.toISOString().slice(0, 7);
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {});
      }
      
      const monthData = monthsMap.get(monthKey);
      monthData[outcome.type] = (monthData[outcome.type] || 0) + 1;
      types.add(outcome.type);
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthsMap.keys()).sort();
    trends.labels = sortedMonths;

    // Create dataset for each type
    Array.from(types).forEach(type => {
      const data = sortedMonths.map(month => monthsMap.get(month)[type] || 0);
      trends.datasets.push({
        label: type,
        data
      });
    });

    // Calculate growth rates
    const growthRates = this.calculateGrowthRates(outcomes, months);

    return {
      trends,
      growthRates,
      total: outcomes.length,
      period: `${months} months`
    };
  }

  private calculateGrowthRates(outcomes: any[], months: number) {
    if (outcomes.length < 2) return {};

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.setMonth(now.getMonth() - 1)).toISOString().slice(0, 7);

    const currentCount = outcomes.filter(o => o.date.toISOString().slice(0, 7) === currentMonth).length;
    const previousCount = outcomes.filter(o => o.date.toISOString().slice(0, 7) === lastMonth).length;

    const monthlyGrowth = previousCount > 0 
      ? ((currentCount - previousCount) / previousCount) * 100 
      : 0;

    const yearlyStart = new Date();
    yearlyStart.setMonth(yearlyStart.getMonth() - 12);
    const yearlyCount = outcomes.filter(o => o.date >= yearlyStart).length;

    const previousYearStart = new Date();
    previousYearStart.setMonth(previousYearStart.getMonth() - 24);
    const previousYearEnd = new Date();
    previousYearEnd.setMonth(previousYearEnd.getMonth() - 12);
    const previousYearCount = outcomes.filter(o => 
      o.date >= previousYearStart && o.date < previousYearEnd
    ).length;

    const yearlyGrowth = previousYearCount > 0 
      ? ((yearlyCount - previousYearCount) / previousYearCount) * 100 
      : 0;

    return {
      monthly: monthlyGrowth,
      yearly: yearlyGrowth,
      currentMonth: currentCount,
      lastMonth: previousCount,
      currentYear: yearlyCount,
      lastYear: previousYearCount
    };
  }

  private getAchievementVerb(type: OutcomeType): string {
    switch (type) {
      case 'PATENT':
        return 'filed';
      case 'PAPER':
        return 'published';
      case 'STARTUP':
        return 'launched';
      case 'CERTIFICATION':
        return 'completed';
      case 'PROJECT':
        return 'completed';
      default:
        return 'achieved';
    }
  }
}