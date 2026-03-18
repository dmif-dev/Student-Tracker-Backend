// backend/src/controllers/program.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ProgramService } from '../services/program.service.js';

const programService = new ProgramService();

export class ProgramController {
  async getAllPrograms(req: AuthRequest, res: Response) {
    try {
      const { includeStats = 'true' } = req.query;
      
      const programs = await prisma.program.findMany({
        include: {
          tracks: includeStats === 'true',
          _count: {
            select: {
              students: true,
              tracks: true
            }
          }
        }
      });

      // Add computed metrics
      const programsWithMetrics = await Promise.all(
        programs.map(async (program) => ({
          ...program,
          metrics: await programService.calculateProgramMetrics(program.id)
        }))
      );

      res.json(programsWithMetrics);
    } catch (error) {
      console.error('Get programs error:', error);
      res.status(500).json({ error: 'Failed to fetch programs' });
    }
  }

  async getProgramById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const program = await prisma.program.findUnique({
        where: { id },
        include: {
          tracks: {
            include: {
              _count: {
                select: { students: true }
              }
            }
          },
          students: {
            take: 10,
            orderBy: { lastActive: 'desc' },
            select: {
              id: true,
              name: true,
              user: {
                select: { email: true }
              },
              progress: true,
              status: true
            }
          },
          _count: {
            select: {
              students: true,
              tracks: true
            }
          }
        }
      });

      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Get detailed metrics
      const metrics = await programService.calculateDetailedMetrics(id);

      res.json({
        ...program,
        metrics
      });
    } catch (error) {
      console.error('Get program error:', error);
      res.status(500).json({ error: 'Failed to fetch program' });
    }
  }

  async createProgram(req: AuthRequest, res: Response) {
    try {
      const programData = req.body;

      const program = await prisma.program.create({
        data: {
          name: programData.name,
          description: programData.description,
          icon: programData.icon,
          color: programData.color,
          hasMentors: programData.hasMentors || false,
          hasOutcomes: programData.hasOutcomes || false,
          duration: programData.duration
        }
      });

      // Create default tracks if provided
      if (programData.tracks?.length > 0) {
        await prisma.track.createMany({
          data: programData.tracks.map((track: any) => ({
            ...track,
            programId: program.id
          }))
        });
      }

      res.status(201).json(program);
    } catch (error) {
      console.error('Create program error:', error);
      res.status(500).json({ error: 'Failed to create program' });
    }
  }

  async updateProgram(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const program = await prisma.program.update({
        where: { id },
        data: updates
      });

      res.json(program);
    } catch (error) {
      console.error('Update program error:', error);
      res.status(500).json({ error: 'Failed to update program' });
    }
  }

  async deleteProgram(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        // Delete related tracks first
        await tx.track.deleteMany({
          where: { programId: id }
        });

        // Delete students in this program
        await tx.student.deleteMany({
          where: { programId: id }
        });

        // Delete program
        await tx.program.delete({
          where: { id }
        });
      });

      res.json({ message: 'Program deleted successfully' });
    } catch (error) {
      console.error('Delete program error:', error);
      res.status(500).json({ error: 'Failed to delete program' });
    }
  }

  async getTracks(req: AuthRequest, res: Response) {
    try {
      const { programId } = req.params;

      const tracks = await prisma.track.findMany({
        where: { programId },
        include: {
          _count: {
            select: { students: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json(tracks);
    } catch (error) {
      console.error('Get tracks error:', error);
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  }

  async createTrack(req: AuthRequest, res: Response) {
    try {
      const { programId } = req.params;
      const trackData = req.body;

      const track = await prisma.track.create({
        data: {
          ...trackData,
          programId
        }
      });

      res.status(201).json(track);
    } catch (error) {
      console.error('Create track error:', error);
      res.status(500).json({ error: 'Failed to create track' });
    }
  }

  async updateTrack(req: AuthRequest, res: Response) {
    try {
      const { trackId } = req.params;
      const updates = req.body;

      const track = await prisma.track.update({
        where: { id: trackId },
        data: updates
      });

      res.json(track);
    } catch (error) {
      console.error('Update track error:', error);
      res.status(500).json({ error: 'Failed to update track' });
    }
  }

  async deleteTrack(req: AuthRequest, res: Response) {
    try {
      const { trackId } = req.params;

      // Check if track has students
      const studentCount = await prisma.student.count({
        where: { trackId: trackId }
      });

      if (studentCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete track with enrolled students' 
        });
      }

      await prisma.track.delete({
        where: { id: trackId }
      });

      res.json({ message: 'Track deleted successfully' });
    } catch (error) {
      console.error('Delete track error:', error);
      res.status(500).json({ error: 'Failed to delete track' });
    }
  }

  async getProgramMetrics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const metrics = await programService.calculateDetailedMetrics(id);
      res.json(metrics);
    } catch (error) {
      console.error('Get program metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch program metrics' });
    }
  }

  async comparePrograms(req: AuthRequest, res: Response) {
    try {
      const { programIds } = req.query;
      const ids = (programIds as string)?.split(',') || [];

      const comparisons = await Promise.all(
        ids.map(async (id) => ({
          programId: id,
          metrics: await programService.calculateDetailedMetrics(id)
        }))
      );

      res.json(comparisons);
    } catch (error) {
      console.error('Compare programs error:', error);
      res.status(500).json({ error: 'Failed to compare programs' });
    }
  }
}