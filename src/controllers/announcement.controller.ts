// backend/src/controllers/announcement.controller.ts
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export class AnnouncementController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const announcements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(announcements);
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { title, content, target, priority, expiresAt } = req.body;

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          target,
          priority,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: req.user?.adminProfile?.id || ''
        }
      });

      res.status(201).json(announcement);
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updates
      });

      res.json(announcement);
    } catch (error) {
      console.error('Update announcement error:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.announcement.delete({
        where: { id }
      });

      res.json({ message: 'Announcement deleted' });
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  }
}