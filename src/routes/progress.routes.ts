// backend/src/routes/progress.routes.ts
import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { progressValidator } from '../validators/progress.validator.js';

const router = Router();
const progressController = new ProgressController();

// Daily progress
router.post('/', authenticate, validate(progressValidator), progressController.createProgress);
router.get('/student/:studentId', authenticate, progressController.getStudentProgress);
router.get('/:id', authenticate, progressController.getProgressById);
router.put('/:id', authenticate, validate(progressValidator), progressController.updateProgress);
router.delete('/:id', authenticate, progressController.deleteProgress);

// Bulk operations
router.post('/batch', authenticate, authorize('ADMIN', 'MENTOR'), progressController.batchCreateProgress);
router.get('/export/:studentId', authenticate, progressController.exportProgress);

// Statistics
router.get('/stats/:studentId', authenticate, progressController.getProgressStats);
router.get('/trends/:studentId', authenticate, progressController.getProgressTrends);

export default router;