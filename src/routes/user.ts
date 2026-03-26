import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({
    message: 'Authenticated user info',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.user_metadata?.role
    }
  });
});

export default router;
