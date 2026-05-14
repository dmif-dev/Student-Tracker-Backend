import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class AdminNotificationsController {
  // Fetch the list of notifications for the admin user.
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to 100 to avoid performance issues if it grows too large
      });
      res.json(notifications);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // Fetch active, high-priority system alerts.
  async getAlerts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Alerts could be system-level notifications that are not read and have type error or warning
      const alerts = await prisma.notification.findMany({
        where: {
          isRead: false,
          type: { in: ['error', 'warning'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Also dynamically check for failed backups
      const failedBackups = await prisma.backup.findMany({
        where: { status: 'FAILED' }
      });

      const dynamicAlerts = failedBackups.map(b => ({
        id: `alert-backup-${b.id}`,
        title: 'Database Backup Failed',
        message: `Backup ${b.fileName} failed to complete.`,
        type: 'error',
        category: 'system',
        createdAt: b.createdAt
      }));

      res.json([...alerts, ...dynamicAlerts]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }

  // Marks a single notification as read
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const notification = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
      res.json(notification);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  // Marks all unread notifications as read
  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true }
      });
      res.json({ message: 'Marked all as read', count: result.count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }

  // Permanently deletes a notification
  async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.notification.delete({
        where: { id }
      });
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  // Dismisses a system alert
  async dismissAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (id.startsWith('alert-backup-')) {
        // If it's a dynamic alert about a backup, we could acknowledge the backup or just ignore.
        // For simplicity, we just return success.
        return res.json({ message: 'Alert dismissed' });
      }

      await prisma.notification.delete({
        where: { id }
      });
      res.json({ message: 'Alert dismissed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to dismiss alert' });
    }
  }

  // Creates a new notification
  async createNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { title, message, type, category, actionUrl, actionText } = req.body;

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type || 'info',
          category: category || 'system',
          actionUrl,
          actionText
        }
      });
      res.status(201).json(notification);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
}
