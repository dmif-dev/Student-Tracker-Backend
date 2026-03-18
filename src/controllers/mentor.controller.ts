// backend/src/controllers/mentor.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
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

      // Add computed stats
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
      const { id } = req.params;

      const mentor = await prisma.mentor.findUnique({
        where: { id },
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
              }
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

      const stats = await mentorService.calculateMentorStats(id);
      const performance = await mentorService.getMentorPerformance(id, 'month');

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

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: mentorData.email }
      });

      if (!user) {
        // Create user with random password (will need to be reset)
        const tempPassword = Math.random().toString(36).slice(-8);
        user = await prisma.user.create({
          data: {
            email: mentorData.email,
            password: tempPassword, // You should hash this
            role: 'MENTOR'
          }
        });
      }

      // Create mentor profile
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
        // Get mentor to find userId
        const mentor = await tx.mentor.findUnique({
          where: { id }
        });

        if (!mentor) throw new Error('Mentor not found');

        // Delete related records
        await tx.availability.deleteMany({ where: { mentorId: id } });
        await tx.session.deleteMany({ where: { mentorId: id } });
        await tx.document.deleteMany({ where: { uploadedById: id } });
        
        // Delete mentor
        await tx.mentor.delete({ where: { id } });
        
        // Delete user
        await tx.user.delete({ where: { id: mentor.userId } });
      });

      res.json({ message: 'Mentor deleted successfully' });
    } catch (error) {
      console.error('Delete mentor error:', error);
      res.status(500).json({ error: 'Failed to delete mentor' });
    }
  }

  // ==================== Availability Management ====================

  async getAvailability(req: AuthRequest, res: Response) {
    try {
      const { mentorId } = req.params;

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
      const availabilityData = req.body;

      const availability = await prisma.availability.create({
        data: {
          mentorId: availabilityData.mentorId,
          dayOfWeek: availabilityData.dayOfWeek,
          startTime: availabilityData.startTime,
          endTime: availabilityData.endTime,
          isRecurring: availabilityData.isRecurring ?? true,
          specificDate: availabilityData.specificDate ? new Date(availabilityData.specificDate) : null
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
      const { mentorId, slots } = req.body;

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
      const { mentorId } = req.params;

      const students = await prisma.student.findMany({
        where: { mentorId },
        include: {
          dailyProgress: {
            orderBy: { date: 'desc' },
            take: 1
          },
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
      const { mentorId, studentId } = req.params;

      // Check if student exists and is not already assigned
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { mentor: true,
                   program: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.mentorId) {
        return res.status(400).json({ 
          error: 'Student already has a mentor assigned' 
        });
      }

      // Check if program allows mentors (PCP students cannot have mentors)
      if (student.program?.name === 'PCP') {
        return res.status(400).json({ 
          error: 'PCP students cannot have mentors' 
        });
      }

      // Assign student to mentor
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: { mentorId },
        include: {
          mentor: true,
          program: true
        }
      });

      // Update mentor's student count
      await prisma.mentor.update({
        where: { id: mentorId },
        data: {
          students: {
            increment: 1
          }
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: 'info',
          category: 'mentor',
          title: 'Mentor Assigned',
          message: `Dr. ${updatedStudent.mentor?.name} has been assigned as your mentor`,
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
      const { mentorId, studentId } = req.params;

      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.mentorId !== mentorId) {
        return res.status(400).json({ 
          error: 'Student is not assigned to this mentor' 
        });
      }

      // Unassign student
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: { mentorId: null }
      });

      // Update mentor's student count
      await prisma.mentor.update({
        where: { id: mentorId },
        data: {
          students: {
            decrement: 1
          }
        }
      });

      res.json({ message: 'Student unassigned successfully' });
    } catch (error) {
      console.error('Unassign student error:', error);
      res.status(500).json({ error: 'Failed to unassign student' });
    }
  }

  // ==================== Mentor Statistics ====================

  async getMentorStats(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const stats = await mentorService.calculateMentorStats(id);
      res.json(stats);
    } catch (error) {
      console.error('Get mentor stats error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor stats' });
    }
  }

  async getMentorSchedule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(start);
      end.setDate(end.getDate() + 30); // Default to next 30 days

      const schedule = await mentorService.getMentorSchedule(id, start, end);
      res.json(schedule);
    } catch (error) {
      console.error('Get mentor schedule error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor schedule' });
    }
  }

  async getMentorPerformance(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { period = 'month' } = req.query;

      const performance = await mentorService.getMentorPerformance(
        id, 
        period as 'week' | 'month' | 'year'
      );

      res.json(performance);
    } catch (error) {
      console.error('Get mentor performance error:', error);
      res.status(500).json({ error: 'Failed to fetch mentor performance' });
    }
  }

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