// backend/src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

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
      
      const student = await prisma.student.create({
        data: {
          userId: data.userId,
          registrationNumber: data.registrationNumber,
          name: data.name,
          programId: data.programId,
          trackId: data.trackId,
          mentorId: data.mentorId || null,
          status: data.status || 'PENDING',
          joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
          phone: data.phone,
          address: data.address,
        },
        include: {
          program: true, track: true
        }
      });
      
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
      
      const student = await prisma.student.update({
        where: { id },
        data: {
          ...data,
          status: data.status ? data.status.toUpperCase() : undefined
        }
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
