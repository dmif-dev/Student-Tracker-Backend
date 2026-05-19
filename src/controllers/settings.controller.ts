// backend/src/controllers/settings.controller.ts
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export class SettingsController {
  async getPreferences(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { preferences: true }
      });
      res.json(user?.preferences || {});
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  }

  async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const { preferences } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { preferences },
        select: { preferences: true }
      });

      res.json(user.preferences);
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, phone, address, avatar } = req.body;

      if (req.user.role === 'STUDENT') {
        await prisma.student.update({
          where: { userId: req.user.id },
          data: { name, phone, address, avatar }
        });
      } else if (req.user.role === 'MENTOR') {
        await prisma.mentor.update({
          where: { userId: req.user.id },
          data: { name, phone, location: address, avatar }
        });
      } else if (req.user.role === 'ADMIN') {
        await prisma.admin.update({
          where: { userId: req.user.id },
          data: { name }
        });
      }

      console.log(`\n👤 [PROFILE] Profile updated in database for User ID: ${req.user.id} (${req.user.role}) - Name: ${name}`);

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async updateMentorPreferences(req: AuthRequest, res: Response) {
    try {
      if (req.user.role !== 'MENTOR') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { sessionDuration, bufferTime, autoAccept } = req.body;

      const preferences = await prisma.mentorPreference.upsert({
        where: { mentorId: req.user.mentor.id },
        update: {
          sessionDuration,
          bufferTime,
          autoAccept
        },
        create: {
          mentorId: req.user.mentor.id,
          sessionDuration: sessionDuration || 60,
          bufferTime: bufferTime || 15,
          autoAccept: autoAccept || false
        }
      });

      res.json(preferences);
    } catch (error) {
      console.error('Update mentor preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }

  async getMentorPreferences(req: AuthRequest, res: Response) {
    try {
      if (req.user.role !== 'MENTOR') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const preferences = await prisma.mentorPreference.findUnique({
        where: { mentorId: req.user.mentor.id }
      });

      res.json(preferences || { sessionDuration: 60, bufferTime: 15, autoAccept: false });
    } catch (error) {
      console.error('Get mentor preferences error:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  }
}