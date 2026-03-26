// backend/src/routes/announcement.routes.ts
import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const controller = new AnnouncementController();

router.get('/', authenticate, controller.getAll);
router.post('/', authenticate, authorize('ADMIN'), controller.create);
router.put('/:id', authenticate, authorize('ADMIN'), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN'), controller.delete);

export default router;