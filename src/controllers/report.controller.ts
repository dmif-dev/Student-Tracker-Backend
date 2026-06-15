// backend/src/controllers/report.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { ReportGenerationService } from '../services/report-generation.service.js';
import { ExportService } from '../services/export.service.js';
import path from 'path'; // Add this
import fs from 'fs'; // Add this

const reportService = new ReportGenerationService();
const exportService = new ExportService();

export class ReportController {
  // Get report templates
  async getReportTemplates(req: AuthRequest, res: Response) {
    const templates = [
      {
        id: 'weekly-progress',
        name: 'Weekly Progress Report',
        description: 'Student progress, attendance, and activity for the week',
        icon: 'Clock', // Frontend handles icon mapping
        color: 'blue',
        href: '/admin/reports/generate?template=weekly-progress',
      },
      {
        id: 'monthly-analytics',
        name: 'Monthly Analytics Report',
        description: 'Comprehensive analytics including trends and outcomes',
        icon: 'TrendingUp',
        color: 'green',
        href: '/admin/reports/generate?template=monthly-analytics',
      },
    ];
    res.json(templates);
  }

  // Admin: list all generated weekly reports across all students
  async getAllGeneratedReports(req: AuthRequest, res: Response) {
    try {
      const { limit = 20, offset = 0, type, dateRange } = req.query;

      const where: any = {};

      // dateRange filter in days
      if (dateRange && dateRange !== 'all') {
        const days = parseInt(dateRange as string);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          where.generatedAt = { gte: cutoff };
        }
      }

      const [reports, total] = await Promise.all([
        prisma.weeklyReport.findMany({
          where,
          include: {
            student: {
              select: {
                name: true,
                program: { select: { name: true } },
                track: { select: { name: true } }
              }
            }
          },
          orderBy: { generatedAt: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.weeklyReport.count({ where })
      ]);

      const mapped = reports.map((r) => ({
        id: r.id,
        name: `Weekly Report — ${r.student.name} (${new Date(r.weekStart).toLocaleDateString()} – ${new Date(r.weekEnd).toLocaleDateString()})`,
        type: 'weekly' as const,
        generatedAt: r.generatedAt.toISOString(),
        generatedBy: 'System',
        format: 'pdf' as const,
        size: '—',
        student: r.student.name,
        program: r.student.program?.name,
        track: r.student.track?.name,
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
        attendanceRate: r.attendanceRate,
        performanceAvg: r.performanceAvg,
        fileUrl: r.fileUrl,
      }));

      res.json({
        data: mapped,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + reports.length < total
        }
      });
    } catch (error) {
      console.error('Get all generated reports error:', error);
      res.status(500).json({ error: 'Failed to fetch generated reports' });
    }
  }

  async getStudentWeeklyReports(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const [reports, total] = await Promise.all([
        prisma.weeklyReport.findMany({
          where: { studentId },
          include: {
            student: {
              select: {
                name: true,
                program: true,
                track: true
              }
            }
          },
          orderBy: { weekStart: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.weeklyReport.count({ where: { studentId } })
      ]);

      res.json({
        data: reports,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + reports.length < total
        }
      });
    } catch (error) {
      console.error('Get weekly reports error:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }

  async getWeeklyReportById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.weeklyReport.findUnique({
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
          }
        }
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json(report);
    } catch (error) {
      console.error('Get report error:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  }

  async generateWeeklyReport(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { weekStart } = req.query;

      // Check if user has access to this student
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { mentor: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check permission (admin, mentor of this student, or the student themselves)
      const canAccess =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && student.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && req.user.student?.id === studentId);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const startDate = weekStart
        ? new Date(weekStart as string)
        : reportService.getCurrentWeekStart();

      const report = await reportService.generateWeeklyReport(studentId, startDate);

      res.status(201).json(report);
    } catch (error: any) {
      console.error('Generate report error:', error);
      const isValidationError = 
        error.message?.includes('No progress data') || 
        error.message?.includes('already exists');
      res.status(isValidationError ? 400 : 500).json({ error: error.message });
    }
  }

  async generateCustomReport(req: AuthRequest, res: Response) {
    try {
      const reportConfig = req.body;

      // Validate input
      if (!reportConfig.studentIds || !reportConfig.startDate || !reportConfig.endDate) {
        return res.status(400).json({
          error: 'studentIds, startDate, and endDate are required'
        });
      }

      // Check if user has access to all students
      if (req.user?.role !== 'ADMIN') {
        // For non-admins, verify they have access to each student
        const students = await prisma.student.findMany({
          where: {
            id: { in: reportConfig.studentIds },
            ...(req.user?.role === 'MENTOR' ? { mentorId: req.user.mentor?.id } : {})
          }
        });

        if (students.length !== reportConfig.studentIds.length) {
          return res.status(403).json({ error: 'Access denied to one or more students' });
        }
      }

      const report = await reportService.generateCustomReport(reportConfig);

      res.status(201).json(report);
    } catch (error: any) {
      console.error('Generate custom report error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async generateProgramReport(req: AuthRequest, res: Response) {
    try {
      const { programId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await reportService.generateProgramReport(
        programId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(report);
    } catch (error: any) {
      console.error('Generate program report error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteWeeklyReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const report = await prisma.weeklyReport.findUnique({
        where: { id },
        include: { student: true }
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Only admin or the student's mentor can delete
      if (req.user?.role !== 'ADMIN' &&
        !(req.user?.role === 'MENTOR' && report.student.mentorId === req.user.mentor?.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.weeklyReport.delete({
        where: { id }
      });

      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  }

  async exportReport(req: AuthRequest, res: Response) {
    try {
      const { reportId } = req.params;
      const { format = 'pdf' } = req.query;

      const report = await prisma.weeklyReport.findUnique({
        where: { id: reportId },
        include: {
          student: {
            include: {
              mentor: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Check access
      const canAccess =
        req.user?.role === 'ADMIN' ||
        (req.user?.role === 'MENTOR' && report.student.mentorId === req.user.mentor?.id) ||
        (req.user?.role === 'STUDENT' && req.user.student?.id === report.studentId);

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const filePath = await exportService.exportReport(report, format as string);
      const fileName = path.basename(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        fs.unlink(filePath, () => { });
      });
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }

  async scheduleReport(req: AuthRequest, res: Response) {
    try {
      const scheduleData = req.body;

      // Validate required fields
      if (!scheduleData.name || !scheduleData.frequency || !scheduleData.config) {
        return res.status(400).json({
          error: 'name, frequency, and config are required'
        });
      }

      // Note: It's scheduledReport (lowercase) not scheduledReport
      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          name: scheduleData.name,
          frequency: scheduleData.frequency,
          config: scheduleData.config,
          recipients: scheduleData.recipients || [],
          isActive: true,
          createdBy: req.user?.id,
          nextRunAt: reportService.calculateNextRun(
            scheduleData.frequency,
            new Date(scheduleData.startDate || new Date())
          )
        }
      });

      res.status(201).json(scheduledReport);
    } catch (error) {
      console.error('Schedule report error:', error);
      res.status(500).json({ error: 'Failed to schedule report' });
    }
  }

  async getScheduledReports(req: AuthRequest, res: Response) {
    try {
      // Note: It's scheduledReport (lowercase) not scheduledReport
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          ...(req.user?.role !== 'ADMIN' ? { createdBy: req.user?.id } : {})
        },
        orderBy: { nextRunAt: 'asc' }
      });

      res.json(scheduledReports);
    } catch (error) {
      console.error('Get scheduled reports error:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled reports' });
    }
  }

  async updateScheduledReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Note: It's scheduledReport (lowercase) not scheduledReport
      const scheduledReport = await prisma.scheduledReport.findUnique({
        where: { id }
      });

      if (!scheduledReport) {
        return res.status(404).json({ error: 'Scheduled report not found' });
      }

      // Only creator or admin can update
      if (req.user?.role !== 'ADMIN' && scheduledReport.createdBy !== req.user?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Recalculate next run if frequency or start date changed
      if (updates.frequency || updates.startDate) {
        updates.nextRunAt = reportService.calculateNextRun(
          updates.frequency || scheduledReport.frequency,
          new Date(updates.startDate || scheduledReport.createdAt)
        );
      }

      const updated = await prisma.scheduledReport.update({
        where: { id },
        data: updates
      });

      res.json(updated);
    } catch (error) {
      console.error('Update scheduled report error:', error);
      res.status(500).json({ error: 'Failed to update scheduled report' });
    }
  }

  async deleteScheduledReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Note: It's scheduledReport (lowercase) not scheduledReport
      const scheduledReport = await prisma.scheduledReport.findUnique({
        where: { id }
      });

      if (!scheduledReport) {
        return res.status(404).json({ error: 'Scheduled report not found' });
      }

      // Only creator or admin can delete
      if (req.user?.role !== 'ADMIN' && scheduledReport.createdBy !== req.user?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.scheduledReport.delete({
        where: { id }
      });

      res.json({ message: 'Scheduled report deleted' });
    } catch (error) {
      console.error('Delete scheduled report error:', error);
      res.status(500).json({ error: 'Failed to delete scheduled report' });
    }
  }
}