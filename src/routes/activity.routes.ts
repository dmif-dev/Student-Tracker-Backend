// backend/src/routes/activity.routes.ts
import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const controller = new ActivityController();

router.get('/me', authenticate, controller.getUserActivity);
router.get('/system', authenticate, authorize('ADMIN'), controller.getSystemActivity);

export default router;