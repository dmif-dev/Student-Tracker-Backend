import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { progressValidator } from '../validators/progress.validator.js';
import multer from 'multer';

const router = Router();
const progressController = new ProgressController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Daily progress
router.post('/upload', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  });
}, progressController.uploadEvidence.bind(progressController));
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