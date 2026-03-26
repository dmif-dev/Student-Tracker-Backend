// backend/src/services/search.service.ts (Fixed)
import { prisma } from '../lib/prisma.js';
import { ProgramType, OutcomeType, StudentStatus } from '@prisma/client';

export class SearchService {
  async fullTextSearch(query: string, options?: {
    searchIn?: ('students' | 'mentors' | 'programs' | 'documents' | 'outcomes')[];
    limit?: number;
    offset?: number;
  }) {
    const results: any = {
      students: [],
      mentors: [],
      programs: [],
      documents: [],
      outcomes: [],
      metadata: {
        total: 0,
        searchTime: 0
      }
    };

    const startTime = Date.now();
    const searchIn = options?.searchIn || ['students', 'mentors', 'programs', 'documents', 'outcomes'];
    const limit = options?.limit || 20;

    if (searchIn.includes('students')) {
      // Search students - email is in User, need to join
      results.students = await prisma.student.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { registrationNumber: { contains: query, mode: 'insensitive' } },
            // Track is a relation, need to search by track name
            { track: { name: { contains: query, mode: 'insensitive' } } },
            // Search by user email
            { user: { email: { contains: query, mode: 'insensitive' } } }
          ]
        },
        include: {
          user: {
            select: { email: true }
          },
          program: true,
          track: true
        },
        take: limit
      });
    }

    if (searchIn.includes('mentors')) {
      results.mentors = await prisma.mentor.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { expertise: { has: query } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        select: {
          id: true,
          name: true,
          expertise: true,
          rating: true,
          students: true,
          status: true
        }
      });
    }

    if (searchIn.includes('programs')) {
      results.programs = await prisma.program.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        include: {
          _count: {
            select: { students: true, tracks: true }
          }
        }
      });
    }

    if (searchIn.includes('documents')) {
      results.documents = await prisma.document.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { fileName: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        include: {
          uploadedBy: {
            select: { name: true }
          }
        }
      });
    }

    if (searchIn.includes('outcomes')) {
      results.outcomes = await prisma.outcome.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } }
          ]
        },
        take: limit,
        include: {
          student: {
            select: { name: true }
          },
          mentor: {
            select: { name: true }
          }
        }
      });
    }

    // Calculate total
    results.metadata.total = 
      results.students.length + 
      results.mentors.length + 
      results.programs.length + 
      results.documents.length + 
      results.outcomes.length;
    
    results.metadata.searchTime = Date.now() - startTime;

    return results;
  }

  async getSearchSuggestions(query: string, limit: number = 10) {
    const suggestions: Array<{ type: string; value: string }> = [];

    // Student name suggestions
    const students = await prisma.student.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      },
      take: limit,
      select: { name: true }
    });
    students.forEach(s => suggestions.push({ type: 'student', value: s.name }));

    // Mentor name suggestions
    const mentors = await prisma.mentor.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      },
      take: limit,
      select: { name: true }
    });
    mentors.forEach(m => suggestions.push({ type: 'mentor', value: m.name }));

    // Program name suggestions
    const programs = await prisma.program.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      },
      take: limit,
      select: { name: true }
    });
    programs.forEach(p => suggestions.push({ type: 'program', value: p.name }));

    return suggestions.slice(0, limit);
  }
}