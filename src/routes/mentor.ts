import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply Mentor or Admin protection
router.use(authenticate, authorize(['Mentor']));

router.get('/my-students', (req: AuthRequest, res) => {
  res.json({
    message: 'Mentor access: list of assigned students',
    data: [
      { name: 'John Doe', track: 'G-GMP' },
      { name: 'Jane Smith', track: 'G-CMP' }
    ]
  });
});

export default router;
