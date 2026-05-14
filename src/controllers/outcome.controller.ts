// backend/src/controllers/outcome.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { OutcomeService } from '../services/outcome.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { logActivity } from '../utils/activity.js';

const outcomeService = new OutcomeService();
const analyticsService = new AnalyticsService();

export class OutcomeController {
  // ==================== Outcome CRUD ====================

  async createOutcome(req: AuthRequest, res: Response) {
    try {
      const outcomeData = req.body;

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: outcomeData.studentId },
        include: { mentor: true, program: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check permissions
      const canCreate =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && student.mentorId === req.user.mentor?.id);

      if (!canCreate) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const outcome = await outcomeService.createOutcome(outcomeData, req.user.id);

      // Log the activity
      if (req.user?.id) {
        await logActivity(req.user.id, 'outcome', {
          title: `New Outcome: ${outcome.title}`,
          details: `Type: ${outcome.type}, Status: ${outcome.status}`,
          studentId: student.id,
          program: student.program?.name,
        });
      }

      res.status(201).json(outcome);
    } catch (error) {
      console.error('Create outcome error:', error);
      res.status(500).json({ error: 'Failed to create outcome' });
    }
  }

  async getOutcomes(req: AuthRequest, res: Response) {
    try {
      const filters = req.query;

      // Filter based on user role
      if (req.user?.role === 'STUDENT') {
        filters.studentId = req.user.student?.id;
      } else if (req.user?.role === 'MENTOR') {
        filters.mentorId = req.user.mentor?.id;
      }

      const outcomes = await outcomeService.getOutcomes(filters);
      res.json(outcomes);
    } catch (error) {
      console.error('Get outcomes error:', error);
      res.status(500).json({ error: 'Failed to fetch outcomes' });
    }
  }

  async getOutcomeById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const outcome = await outcomeService.getOutcomeById(id);

      if (!outcome) {
        return res.status(404).json({ error: 'Outcome not found' });
      }

      // Check access
      const canAccess =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && outcome.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && outcome.studentId === req.user.student?.id);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(outcome);
    } catch (error) {
      console.error('Get outcome error:', error);
      res.status(500).json({ error: 'Failed to fetch outcome' });
    }
  }

  async updateOutcome(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existingOutcome = await prisma.outcome.findUnique({
        where: { id },
        include: { student: true }
      });

      if (!existingOutcome) {
        return res.status(404).json({ error: 'Outcome not found' });
      }

      // Check permissions
      const canUpdate =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && existingOutcome.mentorId === req.user.mentor?.id);

      if (!canUpdate) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const outcome = await outcomeService.updateOutcome(id, updates);
      res.json(outcome);
    } catch (error) {
      console.error('Update outcome error:', error);
      res.status(500).json({ error: 'Failed to update outcome' });
    }
  }

  async deleteOutcome(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const existingOutcome = await prisma.outcome.findUnique({
        where: { id }
      });

      if (!existingOutcome) {
        return res.status(404).json({ error: 'Outcome not found' });
      }

      // Check permissions
      const canDelete =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && existingOutcome.mentorId === req.user.mentor?.id);

      if (!canDelete) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await outcomeService.deleteOutcome(id);
      res.json({ message: 'Outcome deleted successfully' });
    } catch (error) {
      console.error('Delete outcome error:', error);
      res.status(500).json({ error: 'Failed to delete outcome' });
    }
  }

  // ==================== Student Summaries ====================

  async getStudentOutcomeSummary(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;

      // Check access
      const canAccess =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && req.user.mentor?.assignedStudents?.some((s: any) => s.id === studentId)) ||
        (req.user?.role === 'STUDENT' && req.user.student?.id === studentId);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const summary = await outcomeService.getStudentOutcomeSummary(studentId);
      res.json(summary);
    } catch (error) {
      console.error('Get student outcome summary error:', error);
      res.status(500).json({ error: 'Failed to fetch student outcome summary' });
    }
  }

  async getProgramOutcomeSummary(req: AuthRequest, res: Response) {
    try {
      const { program } = req.params;
      const { startDate, endDate } = req.query;

      const summary = await outcomeService.getProgramOutcomeSummary(
        program as any,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(summary);
    } catch (error) {
      console.error('Get program outcome summary error:', error);
      res.status(500).json({ error: 'Failed to fetch program outcome summary' });
    }
  }

  // ==================== Analytics ====================

  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const stats = await analyticsService.getDashboardStats(
        req.user.id,
        req.user.role
      );

      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }

  async getOutcomeTrends(req: AuthRequest, res: Response) {
    try {
      const { program, months = 12 } = req.query;

      const trends = await outcomeService.getOutcomeTrends(
        program as any,
        Number(months)
      );

      res.json(trends);
    } catch (error) {
      console.error('Get outcome trends error:', error);
      res.status(500).json({ error: 'Failed to fetch outcome trends' });
    }
  }

  async generateInsights(req: AuthRequest, res: Response) {
    try {
      const { program } = req.query;

      const insights = await analyticsService.generateInsights(program as any);
      res.json(insights);
    } catch (error) {
      console.error('Generate insights error:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  }

  // ==================== Interaction Tracking ====================

  async trackInteraction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { type } = req.body;

      const outcome = await prisma.outcome.findUnique({
        where: { id }
      });

      if (!outcome) {
        return res.status(404).json({ error: 'Outcome not found' });
      }

      await outcomeService.trackOutcomeInteraction(id, type);

      res.json({ message: 'Interaction tracked successfully' });
    } catch (error) {
      console.error('Track interaction error:', error);
      res.status(500).json({ error: 'Failed to track interaction' });
    }
  }

  // ==================== Export ====================

  async exportOutcomes(req: AuthRequest, res: Response) {
    try {
      const { format = 'json', ...filters } = req.query;

      // Filter based on user role
      if (req.user?.role === 'STUDENT') {
        filters.studentId = req.user.student?.id;
      } else if (req.user?.role === 'MENTOR') {
        filters.mentorId = req.user.mentor?.id;
      }

      const outcomes = await outcomeService.getOutcomes(filters);

      if (format === 'csv') {
        const csvRows = ['Title,Type,Status,Student,Mentor,Date'];

        outcomes.forEach((o: any) => {
          csvRows.push(
            `"${o.title}",${o.type},${o.status},"${o.student?.name || ''}","${o.mentor?.name || ''}",${o.date.toISOString().split('T')[0]}`
          );
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=outcomes.csv');
        res.send(csvRows.join('\n'));
      } else {
        res.json(outcomes);
      }
    } catch (error) {
      console.error('Export outcomes error:', error);
      res.status(500).json({ error: 'Failed to export outcomes' });
    }
  }

  // ==================== Bulk Operations ====================

  async bulkCreateOutcomes(req: AuthRequest, res: Response) {
    try {
      const { outcomes } = req.body;

      if (!Array.isArray(outcomes) || outcomes.length === 0) {
        return res.status(400).json({ error: 'Outcomes array required' });
      }

      const results = await prisma.$transaction(
        outcomes.map((data: any) =>
          prisma.outcome.create({
            data: {
              ...data,
              date: new Date(data.date),
              studentId: data.studentId
            }
          })
        )
      );

      res.status(201).json({
        message: `Created ${results.length} outcomes`,
        outcomes: results
      });
    } catch (error) {
      console.error('Bulk create outcomes error:', error);
      res.status(500).json({ error: 'Failed to create outcomes' });
    }
  }

  async bulkUpdateStatus(req: AuthRequest, res: Response) {
    try {
      const { outcomeIds, status } = req.body;

      const result = await prisma.outcome.updateMany({
        where: { id: { in: outcomeIds } },
        data: { status }
      });

      res.json({
        message: `Updated ${result.count} outcomes`,
        count: result.count
      });
    } catch (error) {
      console.error('Bulk update status error:', error);
      res.status(500).json({ error: 'Failed to update outcomes' });
    }
  }
}