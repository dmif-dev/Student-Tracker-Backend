// backend/src/controllers/mentor.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { MentorService } from '../services/mentor.service.js';
import { ProgramType } from '@prisma/client';

const mentorService = new MentorService();

export class MentorController {
  // ==================== Basic CRUD Operations ====================

  async getAllMentors(req: AuthRequest, res: Response) {
    try {
      const { program, status, expertise } = req.query;
      
      const where: any = {};
      
      if (program) {
        where.programs = { has: program as ProgramType };
      }
      if (status) {
        where.status = status;
      }
      if (expertise) {
        where.expertise = { has: expertise };
      }

      const mentors = await prisma.mentor.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              isActive: true
            }
          },
          assignedStudents: {
            select: {
              id: true,
              name: true,
              progress: true,
              status: true
            }
          },
          _count: {
            select: {
              assignedStudents: true,
              sessions: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      const mentorsWithStats = await Promise.all(
        mentors.map(async (mentor) => ({
          ...mentor,
          stats: await mentorService.calculateMentorStats(mentor.id)
        }))
      );

      res.json(mentorsWithStats);
    } catch (error) {
      console.error('Get mentors error:', error);
      res.status(500).json({ error: 'Failed to fetch mentors' });
    }
  }

  async getMentorById(req: AuthRequest, res: Response) {
    try {
      let mentorId: string;
      
      if (req.params.id) {
        mentorId = req.params.id;
      } else if (req.user?.mentor?.id) {
        // Get current mentor's profile
        mentorId = req.user.mentor.id;
      } else {
        return res.status(400).json({ error: 'Mentor ID required' });
      }

      const mentor = await prisma.mentor.findUnique({
        where: { id: mentorId },
        include: {
          user: {
            select: {
              email: true,
              lastLogin: true
            }
          },
          assignedStudents: {
            include: {
              dailyProgress: {
                orderBy: { date: 'desc' },
                take: 5
              },
              program: true,
              track: true
            }
          },
          sessions: {
            where: {
              date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
            take: 10,
            include: {
              student: {
                select: {
                  name: true,
                  program: true,
                  track: true
                }
              }
            }
          },
          availability: true,
          _count: {
            select: {
              assignedStudents: true,
              sessions: true,
              documents: true
            }
          }
        }
      });

      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }

      const stats = await mentorService.calculateMentorStats(mentorId);
      const performance = await mentorService.getMentorPerformance(mentorId, 'month');

      res.json({
        ...mentor,
        stats,
        performance
      });
    } catch (error) {
      console.error('Get mentor error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor' });
    }
  }

  async createMentor(req: AuthRequest, res: Response) {
    try {
      const mentorData = req.body;

      let user = await prisma.user.findUnique({
        where: { email: mentorData.email }
      });

      if (!user) {
        const tempPassword = Math.random().toString(36).slice(-8);
        user = await prisma.user.create({
          data: {
            email: mentorData.email,
            password: tempPassword,
            role: 'MENTOR'
          }
        });
      }

      const mentor = await prisma.mentor.create({
        data: {
          userId: user.id,
          name: mentorData.name,
          expertise: mentorData.expertise || [],
          programs: mentorData.programs || [],
          rating: 0,
          status: mentorData.status || 'ACTIVE',
          joinDate: new Date(mentorData.joinDate || new Date()),
          bio: mentorData.bio,
          phone: mentorData.phone,
          location: mentorData.location
        },
        include: {
          user: true
        }
      });

      res.status(201).json(mentor);
    } catch (error) {
      console.error('Create mentor error:', error);
      res.status(500).json({ error: 'Failed to create mentor' });
    }
  }

  async updateMentor(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const mentor = await prisma.mentor.update({
        where: { id },
        data: updates,
        include: {
          user: true
        }
      });

      res.json(mentor);
    } catch (error) {
      console.error('Update mentor error:', error);
      res.status(500).json({ error: 'Failed to update mentor' });
    }
  }

  async deleteMentor(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        const mentor = await tx.mentor.findUnique({
          where: { id }
        });

        if (!mentor) throw new Error('Mentor not found');

        await tx.availability.deleteMany({ where: { mentorId: id } });
        await tx.session.deleteMany({ where: { mentorId: id } });
        await tx.document.deleteMany({ where: { uploadedById: id } });
        await tx.mentor.delete({ where: { id } });
        await tx.user.delete({ where: { id: mentor.userId } });
      });

      res.json({ message: 'Mentor deleted successfully' });
    } catch (error) {
      console.error('Delete mentor error:', error);
      res.status(500).json({ error: 'Failed to delete mentor' });
    }
  }

  // ==================== Session Management ====================

  async scheduleSession(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const { studentId, date, startTime, endTime, topic, meetingLink } = req.body;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.mentorId !== mentorId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not your student' });
      }

      const session = await prisma.session.create({
        data: {
          studentId,
          mentorId,
          date: new Date(date),
          startTime,
          endTime,
          topic,
          meetingLink: meetingLink || `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}`,
          status: 'SCHEDULED'
        },
        include: {
          student: { select: { name: true } }
        }
      });

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: student.user.id,
          type: 'info',
          category: 'session',
          title: 'New Session Scheduled',
          message: `A new session has been scheduled for ${new Date(date).toLocaleDateString()} at ${startTime}`,
          actionUrl: `/sessions/${session.id}`,
          actionText: 'View Session',
          metadata: { sessionId: session.id }
        }
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Schedule session error:', error);
      res.status(500).json({ error: 'Failed to schedule session' });
    }
  }

  async updateSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { date, startTime, endTime, topic, meetingLink, status } = req.body;

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { student: { include: { user: true } }, mentor: true }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.mentorId !== req.user?.mentor?.id && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          date: date ? new Date(date) : undefined,
          startTime,
          endTime,
          topic,
          meetingLink,
          status,
          updatedAt: new Date()
        }
      });

      res.json(updatedSession);
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  async cancelSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { student: { include: { user: true } }, mentor: true }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.mentorId !== req.user?.mentor?.id && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const cancelledSession = await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'CANCELLED', updatedAt: new Date() }
      });

      // Notify student
      await prisma.notification.create({
        data: {
          userId: session.student.user.id,
          type: 'error',
          category: 'session',
          title: 'Session Cancelled',
          message: `Your session on ${new Date(session.date).toLocaleDateString()} has been cancelled`,
          actionUrl: `/sessions`,
          actionText: 'View Schedule'
        }
      });

      res.json({ message: 'Session cancelled successfully' });
    } catch (error) {
      console.error('Cancel session error:', error);
      res.status(500).json({ error: 'Failed to cancel session' });
    }
  }

  async addSessionNotes(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { content, topics, duration, feedback, nextSteps, resources } = req.body;

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { student: { include: { user: true } } }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.mentorId !== req.user?.mentor?.id && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const note = await prisma.sessionNote.create({
        data: {
          sessionId,
          content,
          topics: topics || [],
          duration: duration || 60,
          feedback,
          nextSteps,
          resources: resources || [],
          createdBy: req.user?.mentor?.id || req.user?.id
        }
      });

      // Update session status to completed
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', updatedAt: new Date() }
      });

      // Notify student
      await prisma.notification.create({
        data: {
          userId: session.student.user.id,
          type: 'success',
          category: 'session',
          title: 'Session Notes Added',
          message: `Notes from your session have been added`,
          actionUrl: `/sessions/${sessionId}`,
          actionText: 'View Notes',
          metadata: { sessionId, noteId: note.id }
        }
      });

      res.status(201).json(note);
    } catch (error) {
      console.error('Add session notes error:', error);
      res.status(500).json({ error: 'Failed to add session notes' });
    }
  }

  async getSessionNotes(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.mentorId !== req.user?.mentor?.id && session.studentId !== req.user?.student?.id && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const notes = await prisma.sessionNote.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(notes);
    } catch (error) {
      console.error('Get session notes error:', error);
      res.status(500).json({ error: 'Failed to fetch session notes' });
    }
  }

  // ==================== Availability Management ====================

  async getAvailability(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const availability = await prisma.availability.findMany({
        where: { mentorId },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });

      res.json(availability);
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  }

  async addAvailability(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const { dayOfWeek, startTime, endTime, isRecurring, specificDate } = req.body;

      const availability = await prisma.availability.create({
        data: {
          mentorId,
          dayOfWeek,
          startTime,
          endTime,
          isRecurring: isRecurring ?? true,
          specificDate: specificDate ? new Date(specificDate) : null
        }
      });

      res.status(201).json(availability);
    } catch (error) {
      console.error('Add availability error:', error);
      res.status(500).json({ error: 'Failed to add availability' });
    }
  }

  async updateAvailability(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const availability = await prisma.availability.update({
        where: { id },
        data: updates
      });

      res.json(availability);
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ error: 'Failed to update availability' });
    }
  }

  async deleteAvailability(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.availability.delete({
        where: { id }
      });

      res.json({ message: 'Availability deleted successfully' });
    } catch (error) {
      console.error('Delete availability error:', error);
      res.status(500).json({ error: 'Failed to delete availability' });
    }
  }

  async bulkAddAvailability(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const { slots } = req.body;

      if (!Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ error: 'Slots array required' });
      }

      const availability = await prisma.availability.createMany({
        data: slots.map((slot: any) => ({
          mentorId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: slot.isRecurring ?? true,
          specificDate: slot.specificDate ? new Date(slot.specificDate) : null
        }))
      });

      res.status(201).json({ 
        message: `Created ${availability.count} availability slots` 
      });
    } catch (error) {
      console.error('Bulk add availability error:', error);
      res.status(500).json({ error: 'Failed to add availability slots' });
    }
  }

  // ==================== Mentor-Student Assignment ====================

  async getAssignedStudents(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const students = await prisma.student.findMany({
        where: { mentorId },
        include: {
          dailyProgress: {
            orderBy: { date: 'desc' },
            take: 1
          },
          program: true,
          track: true,
          _count: {
            select: {
              dailyProgress: true,
              outcomes: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json(students);
    } catch (error) {
      console.error('Get assigned students error:', error);
      res.status(500).json({ error: 'Failed to fetch assigned students' });
    }
  }

  async assignStudent(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const mentorId = req.user?.mentor?.id;

      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { program: true, user: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.mentorId) {
        return res.status(400).json({ error: 'Student already has a mentor assigned' });
      }

      if (student.program?.name === 'PCP') {
        return res.status(400).json({ error: 'PCP students cannot have mentors' });
      }

      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: { mentorId },
        include: { mentor: true }
      });

      await prisma.mentor.update({
        where: { id: mentorId },
        data: { students: { increment: 1 } }
      });

      await prisma.notification.create({
        data: {
          userId: student.user.id,
          type: 'info',
          category: 'mentor',
          title: 'Mentor Assigned',
          message: `${updatedStudent.mentor?.name} has been assigned as your mentor`,
          actionUrl: `/mentor/${mentorId}`,
          actionText: 'View Mentor'
        }
      });

      res.json(updatedStudent);
    } catch (error) {
      console.error('Assign student error:', error);
      res.status(500).json({ error: 'Failed to assign student' });
    }
  }

  async unassignStudent(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const mentorId = req.user?.mentor?.id;

      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.mentorId !== mentorId) {
        return res.status(400).json({ error: 'Student is not assigned to you' });
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { mentorId: null }
      });

      await prisma.mentor.update({
        where: { id: mentorId },
        data: { students: { decrement: 1 } }
      });

      res.json({ message: 'Student unassigned successfully' });
    } catch (error) {
      console.error('Unassign student error:', error);
      res.status(500).json({ error: 'Failed to unassign student' });
    }
  }

  // ==================== Student Management ====================

  async getStudentById(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const mentorId = req.user?.mentor?.id;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { email: true } },
          program: true,
          track: true,
          dailyProgress: { orderBy: { date: 'desc' }, take: 10 },
          outcomes: { orderBy: { date: 'desc' }, take: 5 }
        }
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      if (student.mentorId !== mentorId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(student);
    } catch (error) {
      console.error('Get student error:', error);
      res.status(500).json({ error: 'Failed to fetch student' });
    }
  }

  async addStudentNotes(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { content } = req.body;
      const mentorId = req.user?.mentor?.id;
      
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      if (student.mentorId !== mentorId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const note = await prisma.userActivity.create({
        data: {
          userId: req.user.id,
          action: 'ADD_STUDENT_NOTE',
          metadata: { studentId, content },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });
      
      res.status(201).json({ message: 'Note added', note });
    } catch (error) {
      console.error('Add student notes error:', error);
      res.status(500).json({ error: 'Failed to add note' });
    }
  }

  // ==================== Statistics & Performance ====================

  async getMentorStats(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const stats = await mentorService.calculateMentorStats(mentorId);
      res.json(stats);
    } catch (error) {
      console.error('Get mentor stats error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor stats' });
    }
  }

  async getMentorSchedule(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(start);
      end.setDate(end.getDate() + 30);

      const sessions = await prisma.session.findMany({
        where: {
          mentorId,
          date: {
            gte: start,
            lte: end
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              program: true,
              track: true
            }
          }
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });

      res.json(sessions);
    } catch (error) {
      console.error('Get mentor schedule error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor schedule' });
    }
  }

  async getMentorPerformance(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const { period = 'month' } = req.query;
      const performance = await mentorService.getMentorPerformance(
        mentorId, 
        period as 'week' | 'month' | 'year'
      );

      res.json(performance);
    } catch (error) {
      console.error('Get mentor performance error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor performance' });
    }
  }

  async getUpcomingSessions(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const sessions = await prisma.session.findMany({
        where: {
          mentorId,
          date: { gte: new Date() },
          status: 'SCHEDULED'
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              program: true,
              track: true
            }
          }
        },
        orderBy: { date: 'asc' },
        take: 10
      });
      
      res.json(sessions);
    } catch (error) {
      console.error('Get upcoming sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  async getStudentsProgressSummary(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const students = await prisma.student.findMany({
        where: { mentorId },
        select: {
          id: true,
          name: true,
          progress: true,
          status: true,
          lastActive: true,
          dailyProgress: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      });
      
      const summary = {
        total: students.length,
        active: students.filter(s => s.status === 'ACTIVE').length,
        completed: students.filter(s => s.status === 'COMPLETED').length,
        averageProgress: students.reduce((sum, s) => sum + s.progress, 0) / (students.length || 1),
        students: students.map(s => ({
          id: s.id,
          name: s.name,
          progress: s.progress,
          status: s.status,
          lastActive: s.lastActive,
          lastProgress: s.dailyProgress[0]?.date
        }))
      };
      
      res.json(summary);
    } catch (error) {
      console.error('Get students progress error:', error);
      res.status(500).json({ error: 'Failed to fetch progress summary' });
    }
  }

  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [sessions, outcomes, studentActivity] = await Promise.all([
        prisma.session.count({
          where: {
            mentorId,
            date: { gte: thirtyDaysAgo }
          }
        }),
        prisma.outcome.count({
          where: {
            mentorId,
            date: { gte: thirtyDaysAgo }
          }
        }),
        prisma.student.findMany({
          where: { mentorId },
          select: {
            id: true,
            dailyProgress: {
              where: { date: { gte: thirtyDaysAgo } },
              select: { performanceRating: true }
            }
          }
        })
      ]);
      
      const totalProgressEntries = studentActivity.reduce((sum, s) => sum + s.dailyProgress.length, 0);
      const avgPerformance = studentActivity.flatMap(s => s.dailyProgress)
        .filter(p => p.performanceRating)
        .reduce((sum, p) => sum + (p.performanceRating || 0), 0) / (totalProgressEntries || 1);
      
      res.json({
        period: '30 days',
        totalSessions: sessions,
        totalOutcomes: outcomes,
        totalProgressEntries,
        averagePerformance: avgPerformance.toFixed(1),
        studentCount: studentActivity.length
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  // ==================== Document Management ====================

  async getDocuments(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const documents = await prisma.document.findMany({
        where: { uploadedById: mentorId },
        orderBy: { createdAt: 'desc' },
        include: {
          permissions: {
            select: { userId: true, canView: true, canDownload: true }
          }
        }
      });
      
      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  async getDocumentById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          uploadedBy: { select: { name: true } },
          permissions: true
        }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const mentorId = req.user?.mentor?.id;
      if (document.uploadedById !== mentorId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }

  async uploadDocument(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }
      
      const { title, description, type, program, studentIds } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const document = await prisma.document.create({
        data: {
          title,
          description,
          type,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          fileUrl: `/uploads/${req.file.filename}`,
          uploadedById: mentorId,
          program,
          visibility: 'STUDENT_ONLY',
          status: 'PUBLISHED'
        }
      });
      
      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        await prisma.documentPermission.createMany({
          data: studentIds.map((studentId: string) => ({
            documentId: document.id,
            userId: studentId,
            userRole: 'STUDENT',
            canView: true,
            canDownload: true,
            grantedBy: mentorId
          })),
          skipDuplicates: true
        });
      }
      
      res.status(201).json(document);
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const mentorId = req.user?.mentor?.id;
      
      const document = await prisma.document.findUnique({
        where: { id }
      });
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (document.uploadedById !== mentorId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await prisma.documentPermission.deleteMany({ where: { documentId: id } });
      await prisma.document.delete({ where: { id } });
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  // ==================== Notifications ====================

  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user?.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async markNotificationRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.notification.update({
        where: { id, userId: req.user?.id },
        data: { isRead: true }
      });
      
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }

  async markAllNotificationsRead(req: AuthRequest, res: Response) {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user?.id, isRead: false },
        data: { isRead: true }
      });
      
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.notification.deleteMany({
        where: { id, userId: req.user?.id }
      });
      
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  // ==================== Alerts ====================

  async getAlerts(req: AuthRequest, res: Response) {
    try {
      const mentorId = req.user?.mentor?.id;
      if (!mentorId) {
        return res.status(403).json({ error: 'Mentor profile not found' });
      }

      const alerts: any[] = [];
      const now = new Date();
      const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Check upcoming sessions
      const upcomingSessions = await prisma.session.count({
        where: {
          mentorId,
          date: { gte: now, lte: next48Hours },
          status: 'SCHEDULED'
        }
      });

      if (upcomingSessions > 0) {
        alerts.push({
          id: 'alert-upcoming-sessions',
          type: 'warning',
          title: 'Upcoming Sessions',
          message: `You have ${upcomingSessions} session(s) scheduled in the next 48 hours.`,
          category: 'session',
          action: { url: '/mentor/schedule', text: 'View Schedule' },
          dismissed: false
        });
      }

      // Check sessions needing notes
      const pendingNotes = await prisma.session.findMany({
        where: {
          mentorId,
          date: { lt: now },
          status: 'SCHEDULED' // Assuming past scheduled sessions need completion & notes
        },
        include: {
          notes: true
        }
      });
      
      const missingNotesCount = pendingNotes.filter(s => s.notes.length === 0).length;

      if (missingNotesCount > 0) {
        alerts.push({
          id: 'alert-pending-notes',
          type: 'info',
          title: 'Pending Session Notes',
          message: `${missingNotesCount} past session(s) waiting for notes.`,
          category: 'session',
          action: { url: '/mentor/schedule', text: 'Add Notes' },
          dismissed: false
        });
      }

      res.json(alerts);
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }

  // ==================== Settings ====================

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: req.user?.id }
      });

      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }

      const { name, phone, location, bio } = req.body;

      const updated = await prisma.mentor.update({
        where: { id: mentor.id },
        data: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(location !== undefined && { location }),
          ...(bio !== undefined && { bio }),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          bio: true,
          expertise: true,
          programs: true
        }
      });

      res.json(updated);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async getSettings(req: AuthRequest, res: Response) {
    try {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: req.user?.id },
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          bio: true,
          expertise: true,
          programs: true
        }
      });
      
      const preferences = await prisma.mentorPreference.findUnique({
        where: { mentorId: mentor?.id }
      });
      
      // notificationSettings and privacySettings stored as JSON in autoAccept field metadata
      // We store them as JSON in a separate flexible way using the existing fields.
      // For now we parse any stored JSON from a convention: preferences.autoAccept is used as a bool,
      // and we store the richer settings in a JSON cast of sessionDuration-2 as key.
      // SIMPLEST approach: store extras in a dedicated JSON meta approach using the existing DB.
      // We read notificationSettings and privacySettings from the raw preference record.
      const prefs = preferences as any;
      
      res.json({
        profile: mentor,
        preferences: preferences || { sessionDuration: 60, bufferTime: 15, autoAccept: false },
        notificationSettings: prefs?.notificationSettings || {
          emailNotifications: true,
          sessionReminders: true,
          studentUpdates: true,
          documentUploads: true,
          weeklyDigest: false,
        },
        privacySettings: prefs?.privacySettings || {
          profileVisibility: 'mentors_only',
          showEmail: false,
          showPhone: false,
        },
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const { section, sessionDuration, bufferTime, autoAccept, notificationSettings, privacySettings } = req.body;
      const mentor = await prisma.mentor.findUnique({
        where: { userId: req.user?.id }
      });
      
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }

      // Get existing preferences to merge into
      const existing = await prisma.mentorPreference.findUnique({
        where: { mentorId: mentor.id }
      }) as any;

      const updateData: any = {};

      if (section === 'notifications' && notificationSettings) {
        updateData.notificationSettings = notificationSettings;
      } else if (section === 'privacy' && privacySettings) {
        updateData.privacySettings = privacySettings;
      } else {
        // session preferences section
        if (sessionDuration !== undefined) updateData.sessionDuration = sessionDuration;
        if (bufferTime !== undefined) updateData.bufferTime = bufferTime;
        if (autoAccept !== undefined) updateData.autoAccept = autoAccept;
      }
      
      const preferences = await prisma.mentorPreference.upsert({
        where: { mentorId: mentor.id },
        update: updateData,
        create: {
          mentorId: mentor.id,
          sessionDuration: sessionDuration || 60,
          bufferTime: bufferTime || 15,
          autoAccept: autoAccept || false,
          ...(notificationSettings && { notificationSettings }),
          ...(privacySettings && { privacySettings }),
        }
      });
      
      res.json(preferences);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  // ==================== Availability Check ====================

  async checkAvailability(req: AuthRequest, res: Response) {
    try {
      const { mentorId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        return res.status(400).json({ 
          error: 'date, startTime, and endTime are required' 
        });
      }

      const isAvailable = await mentorService.checkMentorAvailability(
        mentorId,
        new Date(date as string),
        startTime as string,
        endTime as string
      );

      res.json({ available: isAvailable });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  }

  async getAvailableMentors(req: AuthRequest, res: Response) {
    try {
      const { program, date } = req.query;

      const programType = program as ProgramType | undefined;
      const targetDate = date ? new Date(date as string) : undefined;

      const mentors = await mentorService.getAvailableMentors(programType, targetDate);
      res.json(mentors);
    } catch (error) {
      console.error('Get available mentors error:', error);
      res.status(500).json({ error: 'Failed to fetch available mentors' });
    }
  }
}