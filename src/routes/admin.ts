import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply admin protection to all routes in this file
router.use(authenticate, authorize(['Admin']));

router.get('/all-users', (req: AuthRequest, res) => {
  res.json({
    message: 'Admin access: list of all users',
    data: [
      { id: 1, email: 'student@example.com', role: 'Student' },
      { id: 2, email: 'mentor@example.com', role: 'Mentor' }
    ]
  });
});

router.post('/manage-system', (req: AuthRequest, res) => {
  res.json({ message: 'System configuration updated by Admin' });
});

export default router;
