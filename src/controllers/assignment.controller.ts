// backend/src/controllers/assignment.controller.ts
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export class AssignmentController {
  async createAssignment(req: AuthRequest, res: Response) {
    try {
      const { title, description, documentId, dueDate, points, program, track } = req.body;

      const assignment = await prisma.assignment.create({
        data: {
          title,
          description,
          documentId,
          dueDate: new Date(dueDate),
          points,
          program,
          track,
          mentorId: req.user.mentor.id
        },
        include: { document: true }
      });

      // Create notifications for students
      const students = await prisma.student.findMany({
        where: { program: program as any, track: track || undefined },
        include: { user: true }
      });

      for (const student of students) {
        await prisma.notification.create({
          data: {
            userId: student.user.id,
            type: 'info',
            category: 'assignment',
            title: 'New Assignment',
            message: `New assignment "${title}" is due on ${new Date(dueDate).toLocaleDateString()}`,
            actionUrl: `/assignments/${assignment.id}`,
            actionText: 'View Assignment'
          }
        });
      }

      res.status(201).json(assignment);
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  async getAssignments(req: AuthRequest, res: Response) {
    try {
      const { program, track, studentId } = req.query;

      const where: any = {};
      if (program) where.program = program;
      if (track) where.track = track;

      if (req.user.role === 'MENTOR') {
        where.mentorId = req.user.mentor.id;
      } else if (req.user.role === 'STUDENT') {
        // For students, show assignments that are not yet submitted or overdue
        where.submissions = { none: { studentId: req.user.student.id } };
      }

      const assignments = await prisma.assignment.findMany({
        where,
        include: {
          document: true,
          submissions: req.user.role === 'MENTOR' ? true : {
            where: { studentId: req.user.student?.id },
            take: 1
          },
          _count: {
            select: { submissions: true }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      res.json(assignments);
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }

  async submitAssignment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, files } = req.body;

      const assignment = await prisma.assignment.findUnique({
        where: { id }
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const isLate = new Date() > assignment.dueDate;
      const status = isLate ? 'LATE' : 'SUBMITTED';

      const submission = await prisma.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: id,
            studentId: req.user.student.id
          }
        },
        update: {
          content,
          files,
          status,
          updatedAt: new Date()
        },
        create: {
          assignmentId: id,
          studentId: req.user.student.id,
          content,
          files,
          status
        }
      });

      // Notify mentor
      await prisma.notification.create({
        data: {
          userId: assignment.mentorId,
          type: 'info',
          category: 'assignment',
          title: 'Assignment Submitted',
          message: `${req.user.student.name} submitted "${assignment.title}"`,
          actionUrl: `/assignments/${id}`,
          actionText: 'Review Submission'
        }
      });

      res.json(submission);
    } catch (error) {
      console.error('Submit assignment error:', error);
      res.status(500).json({ error: 'Failed to submit assignment' });
    }
  }

  async gradeSubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { grade, feedback } = req.body;

      const submission = await prisma.submission.update({
        where: { id },
        data: {
          grade,
          feedback,
          status: 'GRADED',
          gradedBy: req.user.mentor.id,
          gradedAt: new Date()
        },
        include: {
          assignment: true,
          student: {
            include: { user: true }
          }
        }
      });

      // Notify student
      await prisma.notification.create({
        data: {
          userId: submission.student.user.id,
          type: 'success',
          category: 'assignment',
          title: 'Assignment Graded',
          message: `Your submission for "${submission.assignment.title}" received ${grade}/${submission.assignment.points} points`,
          actionUrl: `/assignments/${submission.assignmentId}`,
          actionText: 'View Feedback'
        }
      });

      res.json(submission);
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({ error: 'Failed to grade submission' });
    }
  }

  async getSubmissions(req: AuthRequest, res: Response) {
    try {
      const { assignmentId } = req.params;

      const submissions = await prisma.submission.findMany({
        where: { assignmentId },
        include: {
          student: {
            select: {
              name: true,
              registrationNumber: true,
              user: { select: { email: true } }
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      });

      res.json(submissions);
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  }
}