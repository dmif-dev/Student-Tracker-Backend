// backend/src/services/mentor.service.ts
import { prisma } from '../lib/prisma.js';
import { MentorStatus, ProgramType } from '@prisma/client';

export class MentorService {
    async calculateMentorStats(mentorId: string) {
        const mentor = await prisma.mentor.findUnique({
            where: { id: mentorId },
            include: {
                assignedStudents: {
                    include: {
                        dailyProgress: {
                            orderBy: { date: 'desc' },
                            take: 10
                        },
                        outcomes: true
                    }
                },
                sessions: {
                    where: {
                        status: 'COMPLETED'
                    }
                }
            }
        });

        if (!mentor) return null;

        const totalStudents = mentor.assignedStudents.length;
        const activeStudents = mentor.assignedStudents.filter(s => s.status === 'ACTIVE').length;

        const totalSessions = mentor.sessions.length;
        const averageStudentProgress = totalStudents > 0
            ? mentor.assignedStudents.reduce((sum, s) => sum + s.progress, 0) / totalStudents
            : 0;

        const totalOutcomes = mentor.assignedStudents.reduce(
            (sum, s) => sum + s.outcomes.length, 0
        );

        // Calculate session completion rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSessions = mentor.sessions.filter(
            s => new Date(s.date) >= thirtyDaysAgo
        );

        const completionRate = recentSessions.length > 0
            ? (recentSessions.filter(s => s.status === 'COMPLETED').length / recentSessions.length) * 100
            : 0;

        const sessionNotes = await prisma.sessionNote.aggregate({
            where: { session: { mentorId } },
            _avg: { duration: true }
        });
        
        const totalDocuments = await prisma.document.count({
            where: { uploadedById: mentorId }
        });

        return {
            totalStudents,
            activeStudents,
            totalSessions,
            averageStudentProgress,
            totalOutcomes,
            completionRate: Math.round(completionRate),
            rating: mentor.rating,
            averageSessionDuration: Math.round(sessionNotes._avg.duration || 45),
            documentsShared: totalDocuments
        };
    }

    async getAvailableMentors(programType?: ProgramType, date?: Date) {
        const where: any = {
            status: 'ACTIVE'
        };

        if (programType) {
            where.programs = { has: programType };
        }

        const mentors = await prisma.mentor.findMany({
            where,
            include: {
                assignedStudents: true,
                availability: {
                    where: date ? {
                        OR: [
                            { isRecurring: true },
                            { specificDate: date }
                        ]
                    } : undefined
                }
            }
        });

        // Calculate current load for each mentor
        const mentorsWithLoad = await Promise.all(
            mentors.map(async (mentor) => {
                const stats = await this.calculateMentorStats(mentor.id);
                return {
                    ...mentor,
                    currentLoad: mentor.assignedStudents.length,
                    maxCapacity: 15, // Configurable max students per mentor
                    availability: mentor.availability,
                    stats
                };
            })
        );

        return mentorsWithLoad;
    }

    async checkMentorAvailability(mentorId: string, date: Date, startTime: string, endTime: string) {
        const mentor = await prisma.mentor.findUnique({
            where: { id: mentorId },
            include: {
                availability: true,
                sessions: {
                    where: {
                        date,
                        status: { notIn: ['CANCELLED'] }
                    }
                }
            }
        });

        if (!mentor) return false;

        const dayOfWeek = date.getDay();

        // Check if mentor has recurring availability for this day
        const hasAvailability = mentor.availability.some(a =>
            (a.isRecurring && a.dayOfWeek === dayOfWeek) ||
            (!a.isRecurring && a.specificDate && new Date(a.specificDate).toDateString() === date.toDateString())
        );

        if (!hasAvailability) return false;

        // Check for conflicting sessions
        const hasConflict = mentor.sessions.some(session => {
            const sessionStart = session.startTime;
            const sessionEnd = session.endTime;

            return (startTime >= sessionStart && startTime < sessionEnd) ||
                (endTime > sessionStart && endTime <= sessionEnd) ||
                (startTime <= sessionStart && endTime >= sessionEnd);
        });

        return !hasConflict;
    }

    async getMentorSchedule(mentorId: string, startDate: Date, endDate: Date) {
        const sessions = await prisma.session.findMany({
            where: {
                mentorId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                student: {
                    select: {
                        name: true,
                        program: {
                            select: { name: true }
                        },
                        track: true
                    }
                }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        // Group by date
        const schedule = sessions.reduce((acc: any, session) => {
            const dateStr = session.date.toISOString().split('T')[0];
            if (!acc[dateStr]) {
                acc[dateStr] = {
                    date: dateStr,
                    sessions: []
                };
            }
            acc[dateStr].sessions.push({
                id: session.id,
                startTime: session.startTime,
                endTime: session.endTime,
                student: session.student,
                topic: session.topic,
                status: session.status
            });
            return acc;
        }, {});

        return Object.values(schedule);
    }

    async getMentorPerformance(mentorId: string, period: 'week' | 'month' | 'year' = 'month') {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        const [sessions, students, outcomes, completedSessions] = await Promise.all([
            // Total sessions count
            prisma.session.count({
                where: {
                    mentorId,
                    date: { gte: startDate }
                }
            }),

            // Student progress average
            prisma.student.aggregate({
                where: {
                    mentorId
                },
                _avg: {
                    progress: true
                }
            }),

            // Outcomes achieved
            prisma.outcome.count({
                where: {
                    mentorId,
                    date: { gte: startDate }
                }
            }),

            // Completed sessions count for completion rate
            prisma.session.count({
                where: {
                    mentorId,
                    date: { gte: startDate },
                    status: 'COMPLETED'
                }
            })
        ]);

        // Calculate completion rate
        const completionRate = sessions > 0 ? (completedSessions / sessions) * 100 : 0;

        // Get monthly trend
        const monthlyData = await prisma.session.groupBy({
            by: ['date'],
            where: {
                mentorId,
                date: { gte: startDate }
            },
            _count: true,
            orderBy: {
                date: 'asc'
            }
        });

        return {
            period,
            summary: {
                totalSessions: sessions,
                averageStudentProgress: students._avg.progress || 0,
                outcomesAchieved: outcomes,
                completionRate: Math.round(completionRate)
            },
            trend: monthlyData.map(d => ({
                date: d.date.toISOString().split('T')[0],
                sessions: d._count
            }))
        };
    }
}