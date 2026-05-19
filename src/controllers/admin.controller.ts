import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

export class AdminController {
  // ==================== User Management ====================

  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      // Get all users, including their mentor or student or admin profiles
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          mentor: { select: { name: true, status: true } },
          student: { select: { name: true, status: true } },
          adminProfile: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format for the frontend table
      const formattedUsers = users.map(user => {
        let name = 'Unknown';
        let status = user.isActive ? 'active' : 'inactive';

        if (user.role === 'ADMIN' && user.adminProfile) {
          name = user.adminProfile.name;
        } else if (user.role === 'MENTOR' && user.mentor) {
          name = user.mentor.name;
          status = user.mentor.status.toLowerCase();
        } else if (user.role === 'STUDENT' && user.student) {
          name = user.student.name;
          status = user.student.status.toLowerCase();
        }

        return {
          id: user.id,
          name,
          email: user.email,
          role: user.role.toLowerCase(),
          status,
          lastLogin: user.lastLogin ? user.lastLogin.toLocaleString() : 'Never'
        };
      });

      res.json(formattedUsers);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async createUser(req: AuthRequest, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      // Only allow creating ADMIN or STAFF roles through this generic endpoint.
      // Mentors and Students have their own specialized creation flows.
      if (role !== 'admin' && role !== 'staff') {
        return res.status(400).json({ error: 'Invalid role for this endpoint' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN', // Treat staff as ADMIN for now, or you can add STAFF to UserRole enum if needed. Prisma schema only has ADMIN, MENTOR, STUDENT
          adminProfile: {
            create: { name }
          }
        },
        include: { adminProfile: true }
      });

      res.status(201).json({
        id: user.id,
        name: user.adminProfile?.name || 'Admin',
        email: user.email,
        role: 'admin',
        status: 'active',
        lastLogin: 'Never'
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { isActive, role } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(isActive !== undefined && { isActive }),
          // If you need to update role, map it to UserRole enum. But usually role changes are complex.
        }
      });

      res.json({ message: 'User updated successfully', user });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await prisma.user.delete({
        where: { id }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // ==================== Global Settings ====================

  async getGlobalSettings(req: AuthRequest, res: Response) {
    try {
      // Find the primary admin user (the one logged in, since we are using their preferences)
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { preferences: true }
      });

      res.json(user?.preferences || {});
    } catch (error) {
      console.error('Get global settings error:', error);
      res.status(500).json({ error: 'Failed to fetch global settings' });
    }
  }

  async updateGlobalSettings(req: AuthRequest, res: Response) {
    try {
      const { settings } = req.body;

      // Update the preferences of the logged-in admin user
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { preferences: settings },
        select: { preferences: true }
      });

      res.json(user.preferences);
    } catch (error) {
      console.error('Update global settings error:', error);
      res.status(500).json({ error: 'Failed to update global settings' });
    }
  }
}
