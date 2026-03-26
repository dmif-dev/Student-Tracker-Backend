// backend/src/controllers/activity.controller.ts
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class ActivityController {
  async getUserActivity(req: AuthRequest, res: Response) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const activities = await prisma.userActivity.findMany({
        where: { userId: req.user?.id },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.userActivity.count({
        where: { userId: req.user?.id }
      });

      res.json({
        data: activities,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + activities.length < total
        }
      });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  }

  async getSystemActivity(req: AuthRequest, res: Response) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const activities = await prisma.userActivity.findMany({
        include: {
          user: {
            select: { email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.userActivity.count();

      res.json({
        data: activities,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + activities.length < total
        }
      });
    } catch (error) {
      console.error('Get system activity error:', error);
      res.status(500).json({ error: 'Failed to fetch system activity' });
    }
  }
}