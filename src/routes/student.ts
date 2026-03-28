import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply Student or Admin protection
router.use(authenticate, authorize('Student'));

router.get('/my-progress', (req: AuthRequest, res) => {
  res.json({
    message: 'Student access: personal progress data',
    stats: {
      completeness: '75%',
      nextMilestone: 'Lab 5'
    }
  });
});

export default router;
