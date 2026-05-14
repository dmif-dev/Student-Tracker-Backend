// backend/src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

export class StudentController {
  async getAllStudents(req: Request, res: Response) {
    try {
      const { status, programId, search } = req.query;
      
      const where: any = {};
      
      if (status) {
        where.status = status as string;
      }
      
      if (programId) {
        where.programId = programId as string;
      }
      
      if (search) {
        const searchStr = search as string;
        where.OR = [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { registrationNumber: { contains: searchStr, mode: 'insensitive' } },
          { user: { email: { contains: searchStr, mode: 'insensitive' } } }
        ];
      }

      const students = await prisma.student.findMany({
        where,
        include: {
          program: { select: { name: true } },
          track: { select: { name: true } },
          mentor: { select: { name: true } },
          user: { select: { email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map to format suitable for frontend
      const formattedStudents = students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.user?.email || '',
        registrationNumber: s.registrationNumber,
        program: s.program?.name,
        track: s.track?.name,
        mentor: s.mentor?.name,
        status: s.status.toLowerCase(), // Frontend expects lowercase
        joinDate: s.joinDate.toISOString(),
        lastActive: s.lastActive.toISOString(),
        progress: s.progress
      }));

      res.json(formattedStudents);
    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  async getStudentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          program: { select: { name: true } },
          track: { select: { name: true } },
          mentor: { select: { name: true } },
          user: { select: { email: true } },
        }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Format for frontend
      const result = {
        ...student,
        email: student.user?.email || '',
        programName: student.program?.name,
        trackName: student.track?.name,
        mentorName: student.mentor?.name,
        status: student.status.toLowerCase(),
      };

      res.json(result);
    } catch (error) {
      console.error('Get student details error:', error);
      res.status(500).json({ error: 'Failed to fetch student details' });
    }
  }

  async createStudent(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // 1. Get or create User
      let user = null;
      if (data.email) {
        user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
          const tempPassword = Math.random().toString(36).slice(-8);
          // Use bcrypt for passwords if needed, but since this is just mock fix, random is ok
          user = await prisma.user.create({
            data: {
              email: data.email,
              password: tempPassword,
              role: 'STUDENT'
            }
          });
        }
      }
      
      const userId = data.userId || user?.id;
      if (!userId) {
        return res.status(400).json({ error: 'User ID or Email is required' });
      }

      // 2. Resolve program, track, mentor IDs from names if IDs aren't provided directly
      let programId = data.programId;
      if (!programId && data.program) {
        const prog = await prisma.program.findUnique({ where: { name: data.program } });
        if (prog) programId = prog.id;
      }
      
      let trackId = data.trackId;
      if (!trackId && data.track && programId) {
        const track = await prisma.track.findFirst({ where: { name: data.track, programId } });
        if (track) trackId = track.id;
      }
      
      let mentorId = data.mentorId;
      if (!mentorId && data.mentor) {
        const mentor = await prisma.mentor.findFirst({ where: { name: data.mentor } });
        if (mentor) mentorId = mentor.id;
      }

      if (!programId || !trackId) {
        return res.status(400).json({ error: 'Valid Program and Track are required' });
      }

      const student = await prisma.student.create({
        data: {
          userId,
          registrationNumber: data.registrationNumber || `DMIF${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`,
          name: data.name,
          programId: programId,
          trackId: trackId,
          mentorId: mentorId || null,
          status: data.status ? data.status.toUpperCase() : 'PENDING',
          joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
          phone: data.phone,
          address: data.address,
        },
        include: {
          program: true, track: true
        }
      });
      
      // Log the activity
      if ((req as any).user?.id) {
        await logActivity((req as any).user.id, 'enrollment', {
          title: `New Student Enrolled: ${student.name}`,
          details: `${student.name} enrolled in ${student.program?.name} (${student.track?.name})`,
          program: student.program?.name,
          studentId: student.id
        });
      }
      
      res.status(201).json(student);
    } catch (error: any) {
      console.error('Create student error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Student with this registration number or user ID already exists' });
      }
      res.status(500).json({ error: 'Failed to create student' });
    }
  }

  async updateStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      let programId = data.programId;
      if (!programId && data.program) {
        const prog = await prisma.program.findUnique({ where: { name: data.program } });
        if (prog) programId = prog.id;
      }
      
      let trackId = data.trackId;
      if (!trackId && data.track && programId) {
        const track = await prisma.track.findFirst({ where: { name: data.track, programId } });
        if (track) trackId = track.id;
      }
      
      let mentorId = data.mentorId;
      if (!mentorId && data.mentor) {
        const mentor = await prisma.mentor.findFirst({ where: { name: data.mentor } });
        if (mentor) mentorId = mentor.id;
      } else if (data.mentor === '' || data.mentor === null) {
        mentorId = null; // Explicitly clearing mentor
      }

      // Filter to only include valid fields that have been sent
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber;
      if (data.status !== undefined) updateData.status = data.status.toUpperCase();
      if (data.joinDate !== undefined) updateData.joinDate = new Date(data.joinDate);
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      
      if (programId !== undefined) updateData.programId = programId;
      if (trackId !== undefined) updateData.trackId = trackId;
      if (mentorId !== undefined) updateData.mentorId = mentorId;

      const student = await prisma.student.update({
        where: { id },
        data: updateData
      });
      
      res.json(student);
    } catch (error) {
      console.error('Update student error:', error);
      res.status(500).json({ error: 'Failed to update student' });
    }
  }

  async deleteStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.student.delete({
        where: { id }
      });
      
      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Delete student error:', error);
      res.status(500).json({ error: 'Failed to delete student' });
    }
  }
}
