import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to latest 50 notifications
      });

      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification || notification.userId !== req.user.id) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });

      res.json(updated);
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      await prisma.notification.updateMany({
        where: { 
          userId: req.user.id,
          isRead: false
        },
        data: { isRead: true }
      });

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification || notification.userId !== req.user.id) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await prisma.notification.delete({
        where: { id }
      });

      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  async addNotificationHandler(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      const notification = await this.createNotification(req.user.id, data);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Add notification error:', error);
      res.status(500).json({ error: 'Failed to add notification' });
    }
  }

  async createNotification(userId: string, data: {
    type: string;
    category: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    metadata?: any;
    studentId?: string;
    mentorId?: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          ...data
        }
      });
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }
}
