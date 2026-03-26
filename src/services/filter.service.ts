// backend/src/services/filter.service.ts (Fixed)
import { prisma } from '../lib/prisma.js';
import { ProgramType, StudentStatus, OutcomeStatus, OutcomeType } from '@prisma/client';

export class FilterService {
  async filterStudents(filters: {
    program?: ProgramType[];
    track?: string[];
    status?: StudentStatus[];
    mentor?: string[];
    progressMin?: number;
    progressMax?: number;
    joinDateStart?: Date;
    joinDateEnd?: Date;
    lastActiveStart?: Date;
    lastActiveEnd?: Date;
    tags?: string[];
    search?: string;
    sortBy?: 'name' | 'progress' | 'joinDate' | 'lastActive';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.program?.length) {
      where.program = { in: filters.program };
    }
    if (filters.track?.length) {
      where.track = { in: filters.track };
    }
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.mentor?.length) {
      where.mentorId = { in: filters.mentor };
    }
    if (filters.progressMin !== undefined) {
      where.progress = { gte: filters.progressMin };
    }
    if (filters.progressMax !== undefined) {
      where.progress = { ...where.progress, lte: filters.progressMax };
    }
    if (filters.joinDateStart || filters.joinDateEnd) {
      where.joinDate = {};
      if (filters.joinDateStart) where.joinDate.gte = filters.joinDateStart;
      if (filters.joinDateEnd) where.joinDate.lte = filters.joinDateEnd;
    }
    if (filters.lastActiveStart || filters.lastActiveEnd) {
      where.lastActive = {};
      if (filters.lastActiveStart) where.lastActive.gte = filters.lastActiveStart;
      if (filters.lastActiveEnd) where.lastActive.lte = filters.lastActiveEnd;
    }
    if (filters.tags?.length) {
      where.tags = { hasEvery: filters.tags };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
        { track: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          mentor: {
            select: { name: true }
          },
          program: true,
          track: true,
          user: {
            select: { email: true }
          },
          _count: {
            select: {
              dailyProgress: true,
              outcomes: true
            }
          }
        },
        orderBy,
        take: filters.limit || 20,
        skip: filters.offset || 0
      }),
      prisma.student.count({ where })
    ]);

    // Fix: Use Object.keys to safely iterate
    const appliedFilters = Object.keys(filters).filter(key => {
      const value = filters[key as keyof typeof filters];
      return value !== undefined && value !== null && 
             (typeof value !== 'string' || value !== '') &&
             (Array.isArray(value) ? value.length > 0 : true);
    });

    return {
      data: students,
      pagination: {
        total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + students.length < total
      },
      filters: {
        applied: appliedFilters,
        available: await this.getAvailableStudentFilters()
      }
    };
  }

  async getAvailableStudentFilters() {
    const [programs, tracks, mentors, statuses] = await Promise.all([
      prisma.program.findMany({
        select: { id: true, name: true }
      }),
      prisma.track.findMany({
        select: { id: true, name: true },
        distinct: ['name']
      }),
      prisma.mentor.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      }),
      Promise.resolve(Object.values(StudentStatus))
    ]);

    return {
      programs: programs.map(p => ({ value: p.id, label: p.name })),
      tracks: tracks.map(t => ({ value: t.id, label: t.name })),
      mentors: mentors.map(m => ({ value: m.id, label: m.name })),
      statuses: statuses.map(s => ({ value: s, label: s }))
    };
  }

  async filterOutcomes(filters: {
    program?: ProgramType[];
    type?: OutcomeType[];
    status?: OutcomeStatus[];
    student?: string[];
    mentor?: string[];
    dateStart?: Date;
    dateEnd?: Date;
    tags?: string[];
    search?: string;
    sortBy?: 'title' | 'date' | 'status';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.program?.length) {
      where.program = { in: filters.program };
    }
    if (filters.type?.length) {
      where.type = { in: filters.type };
    }
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.student?.length) {
      where.studentId = { in: filters.student };
    }
    if (filters.mentor?.length) {
      where.mentorId = { in: filters.mentor };
    }
    if (filters.dateStart || filters.dateEnd) {
      where.date = {};
      if (filters.dateStart) where.date.gte = filters.dateStart;
      if (filters.dateEnd) where.date.lte = filters.dateEnd;
    }
    if (filters.tags?.length) {
      where.tags = { hasEvery: filters.tags };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.date = 'desc';
    }

    const [outcomes, total] = await Promise.all([
      prisma.outcome.findMany({
        where,
        include: {
          student: {
            select: { name: true }
          },
          mentor: {
            select: { name: true }
          },
          analytics: true
        },
        orderBy,
        take: filters.limit || 20,
        skip: filters.offset || 0
      }),
      prisma.outcome.count({ where })
    ]);

    return {
      data: outcomes,
      pagination: {
        total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + outcomes.length < total
      }
    };
  }
}