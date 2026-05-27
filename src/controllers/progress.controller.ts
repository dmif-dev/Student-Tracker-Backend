// backend/src/controllers/progress.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { ProgressService } from '../services/progress.service.js';
import { ExportService } from '../services/export.service.js';
import { logActivity } from '../utils/activity.js';
import { uploadToSupabase } from '../lib/supabaseStorage.js';

const progressService = new ProgressService();
const exportService = new ExportService();

export class ProgressController {
  async uploadEvidence(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const storagePath = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json({ fileUrl: storagePath });
    } catch (error) {
      console.error('Upload evidence error:', error);
      res.status(500).json({ error: 'Failed to upload evidence' });
    }
  }

  async createProgress(req: AuthRequest, res: Response) {
    try {
      const progressData = req.body;

      // Validate student exists and user has access
      const student = await prisma.student.findUnique({
        where: { id: progressData.studentId },
        include: { mentor: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check permission (student themselves or their mentor)
      if (req.user?.role === 'STUDENT' && req.user.student?.id !== student.id) {
        return res.status(403).json({ error: 'Cannot add progress for other students' });
      }

      if (req.user?.role === 'MENTOR' && student.mentorId !== req.user.mentor?.id) {
        return res.status(403).json({ error: 'Not your student' });
      }

      const progress = await prisma.dailyProgress.create({
        data: {
          ...progressData,
          date: new Date(progressData.date)
        }
      });

      // Update student's lastActive
      await prisma.student.update({
        where: { id: student.id },
        data: { lastActive: new Date() }
      });

      // Check if weekly report should be generated
      await progressService.checkAndGenerateWeeklyReport(student.id);

      // Log the activity
      if (req.user?.id) {
        await logActivity(req.user.id, 'progress_submitted', {
          title: `Progress Update: ${student.name}`,
          details: `Logged ${progressData.hoursSpent} hours on ${progressData.topic}`,
          studentId: student.id,
        });
      }

      res.status(201).json(progress);
    } catch (error) {
      console.error('Create progress error:', error);
      res.status(500).json({ error: 'Failed to create progress' });
    }
  }

  async getStudentProgress(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, limit = 50, offset = 0 } = req.query;

      // Check access
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!progressService.canAccessStudent(req.user, studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const where: any = { studentId };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const [progress, total] = await Promise.all([
        prisma.dailyProgress.findMany({
          where,
          orderBy: { date: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.dailyProgress.count({ where })
      ]);

      res.json({
        data: progress,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + progress.length < total
        }
      });
    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }

  async getProgressById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const progress = await prisma.dailyProgress.findUnique({
        where: { id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              mentorId: true
            }
          }
        }
      });

      if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
      }

      // Check access
      if (!progressService.canAccessStudent(req.user, progress.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(progress);
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }

  async updateProgress(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const progress = await prisma.dailyProgress.findUnique({
        where: { id },
        include: { student: true }
      });

      if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
      }

      // Check permission
      if (req.user?.role === 'STUDENT' && req.user.student?.id !== progress.studentId) {
        return res.status(403).json({ error: 'Cannot edit others progress' });
      }

      const updated = await prisma.dailyProgress.update({
        where: { id },
        data: updates
      });

      res.json(updated);
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }

  async deleteProgress(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const progress = await prisma.dailyProgress.findUnique({
        where: { id }
      });

      if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
      }

      // Only admin or mentor can delete
      if (req.user?.role === 'STUDENT') {
        return res.status(403).json({ error: 'Students cannot delete progress' });
      }

      await prisma.dailyProgress.delete({
        where: { id }
      });

      res.json({ message: 'Progress deleted successfully' });
    } catch (error) {
      console.error('Delete progress error:', error);
      res.status(500).json({ error: 'Failed to delete progress' });
    }
  }

  async batchCreateProgress(req: AuthRequest, res: Response) {
    try {
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'Entries array required' });
      }

      const results = await prisma.$transaction(
        entries.map(entry =>
          prisma.dailyProgress.create({
            data: {
              ...entry,
              date: new Date(entry.date)
            }
          })
        )
      );

      res.status(201).json({
        message: `Created ${results.length} entries`,
        entries: results
      });
    } catch (error) {
      console.error('Batch create error:', error);
      res.status(500).json({ error: 'Failed to create entries' });
    }
  }

  async exportProgress(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { format = 'csv', startDate, endDate } = req.query;

      // Check access
      if (!progressService.canAccessStudent(req.user, studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const progress = await prisma.dailyProgress.findMany({
        where: {
          studentId,
          date: {
            gte: startDate ? new Date(startDate as string) : undefined,
            lte: endDate ? new Date(endDate as string) : undefined
          }
        },
        orderBy: { date: 'asc' }
      });

      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      const fileName = await exportService.exportProgress(
        progress,
        student!,
        format as string
      );

      res.download(fileName);
    } catch (error) {
      console.error('Export progress error:', error);
      res.status(500).json({ error: 'Failed to export progress' });
    }
  }

  async getProgressStats(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      
      // Check access
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Only student, their mentor, or admin can access
      const canAccess = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && student.mentorId === req.user?.mentor?.id) ||
        (req.user?.role === 'STUDENT' && req.user?.student?.id === studentId);
      
      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Use the service method instead
      const stats = await progressService.calculateStudentStats(studentId);
      res.json(stats);
    } catch (error) {
      console.error('Get progress stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  async getProgressTrends(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { months = 6 } = req.query;
      
      // Check access
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });
      
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const canAccess = 
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && student.mentorId === req.user?.mentor?.id) ||
        (req.user?.role === 'STUDENT' && req.user?.student?.id === studentId);
      
      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Use the service method instead
      const trends = await progressService.calculateTrends(studentId, Number(months));
      res.json(trends);
    } catch (error) {
      console.error('Get progress trends error:', error);
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  }
}