// backend/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
const dashboardService = new DashboardService();

router.get('/student', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.student) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const stats = await dashboardService.getStudentDashboardStats(req.user.student.id);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/mentor', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.mentor) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const stats = await dashboardService.getMentorDashboardStats(req.user.mentor.id);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/admin', authenticate, async (req: AuthRequest, res) => {
  try {
    const stats = await dashboardService.getAdminDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;