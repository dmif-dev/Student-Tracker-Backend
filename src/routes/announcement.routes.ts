// backend/src/routes/announcement.routes.ts
import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const controller = new AnnouncementController();

router.get('/', authenticate, controller.getAll);
router.post('/', authenticate, authorize('ADMIN', 'MENTOR'), controller.create);
router.put('/:id', authenticate, authorize('ADMIN', 'MENTOR'), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'MENTOR'), controller.delete);

export default router;