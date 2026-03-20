// backend/src/controllers/session.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { SessionService } from '../services/session.service.js';

const sessionService = new SessionService();

export class SessionController {
  // ==================== Session CRUD ====================

  async scheduleSession(req: AuthRequest, res: Response) {
    try {
      const sessionData = req.body;

      // Check if mentor exists
      const mentor = await prisma.mentor.findUnique({
        where: { id: sessionData.mentorId }
      });

      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: sessionData.studentId },
        include: { program: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check if student has mentor
      if (!student.mentorId && sessionData.mentorId) {
        return res.status(400).json({ 
          error: 'Student does not have a mentor assigned' 
        });
      }

      // Check availability
      const isAvailable = await sessionService.checkAvailability(
        sessionData.mentorId,
        new Date(sessionData.date),
        sessionData.startTime,
        sessionData.endTime
      );

      if (!isAvailable) {
        return res.status(400).json({ 
          error: 'Mentor is not available at this time' 
        });
      }

      // Generate meeting link if not provided
      const meetingLink = sessionData.meetingLink || await sessionService.generateMeetingLink();

      // Create session
      const session = await prisma.session.create({
        data: {
          studentId: sessionData.studentId,
          mentorId: sessionData.mentorId,
          date: new Date(sessionData.date),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          topic: sessionData.topic,
          meetingLink,
          status: 'SCHEDULED'
        },
        include: {
          student: {
            select: {
              name: true,
              user: {
                select: { id: true, email: true }
              }
            }
          },
          mentor: {
            select: {
              name: true,
              user: {
                select: { id: true, email: true }
              }
            }
          }
        }
      });

      // Create notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: session.student.user.id,
            type: 'info',
            category: 'session',
            title: 'Session Scheduled',
            message: `Session with ${session.mentor.name} scheduled for ${new Date(session.date).toLocaleDateString()} at ${session.startTime}`,
            actionUrl: `/sessions/${session.id}`,
            actionText: 'View Session',
            metadata: { sessionId: session.id }
          },
          {
            userId: session.mentor.user.id,
            type: 'info',
            category: 'session',
            title: 'Session Scheduled',
            message: `Session with ${session.student.name} scheduled for ${new Date(session.date).toLocaleDateString()} at ${session.startTime}`,
            actionUrl: `/sessions/${session.id}`,
            actionText: 'View Session',
            metadata: { sessionId: session.id }
          }
        ]
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Schedule session error:', error);
      res.status(500).json({ error: 'Failed to schedule session' });
    }
  }

  async getSessionById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              program: {
                select: { name: true }
              },
              track: true,
              user: {
                select: { email: true }
              }
            }
          },
          mentor: {
            select: {
              id: true,
              name: true,
              expertise: true,
              user: {
                select: { email: true }
              }
            }
          },
          notes: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access rights
      const canAccess = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && session.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && session.studentId === req.user.student?.id);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(session);
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  }

  async updateSession(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          student: {
            include: { user: true }
          },
          mentor: {
            include: { user: true }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access rights (only mentor or admin can update)
      const canUpdate = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && session.mentorId === req.user.mentor?.id);

      if (!canUpdate) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // If date/time changed, check availability
      if (updates.date || updates.startTime || updates.endTime) {
        const newDate = updates.date ? new Date(updates.date) : session.date;
        const newStartTime = updates.startTime || session.startTime;
        const newEndTime = updates.endTime || session.endTime;

        const isAvailable = await sessionService.checkAvailability(
          session.mentorId,
          newDate,
          newStartTime,
          newEndTime,
          id
        );

        if (!isAvailable) {
          return res.status(400).json({ 
            error: 'Mentor is not available at the new time' 
          });
        }
      }

      // Update session
      const updatedSession = await prisma.session.update({
        where: { id },
        data: {
          ...updates,
          date: updates.date ? new Date(updates.date) : undefined,
          status: updates.status || session.status
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

      // Notify about rescheduling
      if (updates.date || updates.startTime || updates.endTime) {
        const notifications = [];
        
        if (session.student.user.id !== req.user?.id) {
          notifications.push({
            userId: session.student.user.id,
            type: 'warning',
            category: 'session',
            title: 'Session Rescheduled',
            message: `Your session with ${session.mentor.name} has been rescheduled to ${new Date(updatedSession.date).toLocaleDateString()} at ${updatedSession.startTime}`,
            actionUrl: `/sessions/${id}`,
            actionText: 'View Session',
            metadata: { sessionId: id }
          });
        }

        if (session.mentor.user.id !== req.user?.id) {
          notifications.push({
            userId: session.mentor.user.id,
            type: 'warning',
            category: 'session',
            title: 'Session Rescheduled',
            message: `Your session with ${session.student.name} has been rescheduled to ${new Date(updatedSession.date).toLocaleDateString()} at ${updatedSession.startTime}`,
            actionUrl: `/sessions/${id}`,
            actionText: 'View Session',
            metadata: { sessionId: id }
          });
        }

        if (notifications.length > 0) {
          await prisma.notification.createMany({ data: notifications });
        }
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  async cancelSession(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          student: {
            include: { user: true }
          },
          mentor: {
            include: { user: true }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access rights
      const canCancel = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && session.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && session.studentId === req.user.student?.id);

      if (!canCancel) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update session status
      const cancelledSession = await prisma.session.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      // Create notifications
      const notifications = [];
      
      if (session.student.user.id !== req.user?.id) {
        notifications.push({
          userId: session.student.user.id,
          type: 'error',
          category: 'session',
          title: 'Session Cancelled',
          message: `Your session with ${session.mentor.name} on ${new Date(session.date).toLocaleDateString()} has been cancelled`,
          actionUrl: `/sessions`,
          actionText: 'View Schedule',
          metadata: { sessionId: id }
        });
      }

      if (session.mentor.user.id !== req.user?.id) {
        notifications.push({
          userId: session.mentor.user.id,
          type: 'error',
          category: 'session',
          title: 'Session Cancelled',
          message: `Your session with ${session.student.name} on ${new Date(session.date).toLocaleDateString()} has been cancelled`,
          actionUrl: `/sessions`,
          actionText: 'View Schedule',
          metadata: { sessionId: id }
        });
      }

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
      }

      res.json({ message: 'Session cancelled successfully' });
    } catch (error) {
      console.error('Cancel session error:', error);
      res.status(500).json({ error: 'Failed to cancel session' });
    }
  }

  // ==================== Session Notes ====================

  async addSessionNotes(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const noteData = req.body;

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          student: {
            include: { user: true }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only mentor or admin can add notes
      const canAddNotes = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && session.mentorId === req.user.mentor?.id);

      if (!canAddNotes) {
        return res.status(403).json({ error: 'Only mentors can add session notes' });
      }

      // Create note
      const note = await prisma.sessionNote.create({
        data: {
          sessionId: id,
          content: noteData.content,
          topics: noteData.topics || [],
          duration: noteData.duration,
          feedback: noteData.feedback,
          nextSteps: noteData.nextSteps,
          resources: noteData.resources || [],
          createdBy: req.user?.mentor?.id || req.user?.id
        }
      });

      // Update session status to completed
      if (session.status !== 'COMPLETED') {
        await prisma.session.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });
      }

      // Notify student
      await prisma.notification.create({
        data: {
          userId: session.student.user.id,
          type: 'success',
          category: 'session',
          title: 'Session Notes Added',
          message: `Notes from your session with ${req.user?.mentor?.name || 'your mentor'} have been added`,
          actionUrl: `/sessions/${id}`,
          actionText: 'View Notes',
          metadata: { sessionId: id, noteId: note.id }
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
      const { id } = req.params;

      const session = await prisma.session.findUnique({
        where: { id }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access
      const canAccess = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && session.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && session.studentId === req.user.student?.id);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const notes = await prisma.sessionNote.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json(notes);
    } catch (error) {
      console.error('Get session notes error:', error);
      res.status(500).json({ error: 'Failed to fetch session notes' });
    }
  }

  // ==================== Session Lists ====================

  async getUpcomingSessions(req: AuthRequest, res: Response) {
    try {
      const { days = 7 } = req.query;

      const sessions = await sessionService.getUpcomingSessions(
        req.user?.id,
        req.user?.role,
        Number(days)
      );

      res.json(sessions);
    } catch (error) {
      console.error('Get upcoming sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming sessions' });
    }
  }

  async getSessionHistory(req: AuthRequest, res: Response) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const history = await sessionService.getSessionHistory(
        req.user?.id,
        req.user?.role,
        Number(limit),
        Number(offset)
      );

      res.json(history);
    } catch (error) {
      console.error('Get session history error:', error);
      res.status(500).json({ error: 'Failed to fetch session history' });
    }
  }

  async getSessionsByMentor(req: AuthRequest, res: Response) {
    try {
      const { mentorId } = req.params;
      const { startDate, endDate, status } = req.query;

      const where: any = { mentorId };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (status) {
        where.status = status;
      }

      const sessions = await prisma.session.findMany({
        where,
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

      res.json(sessions);
    } catch (error) {
      console.error('Get sessions by mentor error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  async getSessionsByStudent(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, status } = req.query;

      const where: any = { studentId };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (status) {
        where.status = status;
      }

      const sessions = await prisma.session.findMany({
        where,
        include: {
          mentor: {
            select: {
              name: true,
              expertise: true
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { startTime: 'asc' }
        ]
      });

      res.json(sessions);
    } catch (error) {
      console.error('Get sessions by student error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  // ==================== Calendar View ====================

  async getCalendarEvents(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'startDate and endDate are required' 
        });
      }

      let where: any = {
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };

      // Filter by user role
      if (req.user?.role === 'MENTOR') {
        where.mentorId = req.user.mentor?.id;
      } else if (req.user?.role === 'STUDENT') {
        where.studentId = req.user.student?.id;
      }

      const sessions = await prisma.session.findMany({
        where,
        include: {
          student: {
            select: {
              name: true,
              program: {
                select: { name: true }
              }
            }
          },
          mentor: {
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });

      // Transform to calendar event format
      const events = sessions.map(session => ({
        id: session.id,
        title: `${session.topic} - ${session.student?.name || session.mentor?.name}`,
        start: new Date(`${session.date.toISOString().split('T')[0]}T${session.startTime}`),
        end: new Date(`${session.date.toISOString().split('T')[0]}T${session.endTime}`),
        backgroundColor: this.getEventColor(session.status),
        borderColor: this.getEventColor(session.status),
        textColor: '#ffffff',
        extendedProps: {
          status: session.status,
          studentName: session.student?.name,
          mentorName: session.mentor?.name,
          topic: session.topic,
          meetingLink: session.meetingLink
        }
      }));

      res.json(events);
    } catch (error) {
      console.error('Get calendar events error:', error);
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  }

  private getEventColor(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return '#3b82f6'; // blue
      case 'COMPLETED':
        return '#10b981'; // green
      case 'CANCELLED':
        return '#ef4444'; // red
      case 'RESCHEDULED':
        return '#f59e0b'; // orange
      default:
        return '#6b7280'; // gray
    }
  }

  // ==================== Statistics ====================

  async getSessionStats(req: AuthRequest, res: Response) {
    try {
      const { mentorId, studentId } = req.query;

      // Check permissions
      if (mentorId && req.user?.role !== 'ADMIN' && req.user?.mentor?.id !== mentorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (studentId && req.user?.role !== 'ADMIN' && req.user?.student?.id !== studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await sessionService.getSessionStats(
        mentorId as string,
        studentId as string
      );

      res.json(stats);
    } catch (error) {
      console.error('Get session stats error:', error);
      res.status(500).json({ error: 'Failed to fetch session statistics' });
    }
  }

  // ==================== Admin Only ====================

  async getAllSessions(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, status, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (status) {
        where.status = status;
      }

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          include: {
            student: {
              select: {
                name: true,
                program: {
                  select: { name: true }
                }
              }
            },
            mentor: {
              select: {
                name: true
              }
            },
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { date: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.session.count({ where })
      ]);

      res.json({
        data: sessions,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + sessions.length < total
        }
      });
    } catch (error) {
      console.error('Get all sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }
}