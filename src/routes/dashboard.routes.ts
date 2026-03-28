// backend/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
const dashboardService = new DashboardService();

// Helper to get student ID
async function getStudentId(user: any): Promise<string | null> {
  if (user.student?.id) return user.student.id;
  
  const student = await prisma.student.findUnique({
    where: { userId: user.id }
  });
  return student?.id || null;
}

// Helper to get mentor ID
async function getMentorId(user: any): Promise<string | null> {
  if (user.mentor?.id) return user.mentor.id;
  
  const mentor = await prisma.mentor.findUnique({
    where: { userId: user.id }
  });
  return mentor?.id || null;
}

// Student dashboard
router.get('/student', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req.user);
    
    if (!studentId) {
      return res.status(403).json({ error: 'Student profile not found' });
    }
    
    const stats = await dashboardService.getStudentDashboardStats(studentId);
    res.json(stats);
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Mentor dashboard
router.get('/mentor', authenticate, async (req: AuthRequest, res) => {
  try {
    const mentorId = await getMentorId(req.user);
    
    if (!mentorId) {
      return res.status(403).json({ error: 'Mentor profile not found' });
    }
    
    const stats = await dashboardService.getMentorDashboardStats(mentorId);
    res.json(stats);
  } catch (error) {
    console.error('Mentor dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Admin dashboard
router.get('/admin', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stats = await dashboardService.getAdminDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;