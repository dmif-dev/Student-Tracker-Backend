// backend/src/routes/outcome.routes.ts
import { Router } from 'express';
import { OutcomeController } from '../controllers/outcome.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  outcomeValidator,
  outcomeFilterValidator,
  analyticsRequestValidator
} from '../validators/outcome.validator.js';

const router = Router();
const outcomeController = new OutcomeController();

// ==================== Outcome CRUD ====================
router.post('/', authenticate, validate(outcomeValidator), outcomeController.createOutcome);
router.get('/', authenticate, outcomeController.getOutcomes);
// ==================== Bulk Operations ====================
router.post('/bulk', authenticate, authorize('ADMIN'), outcomeController.bulkCreateOutcomes);
router.put('/bulk/status', authenticate, authorize('ADMIN'), outcomeController.bulkUpdateStatus);

// ==================== Summaries ====================
router.get('/student/:studentId/summary', authenticate, outcomeController.getStudentOutcomeSummary);
router.get('/program/:program/summary', authenticate, outcomeController.getProgramOutcomeSummary);

// ==================== Analytics ====================
router.get('/analytics/dashboard', authenticate, outcomeController.getDashboardStats);
router.get('/analytics/trends', authenticate, outcomeController.getOutcomeTrends);
router.get('/analytics/insights', authenticate, authorize('ADMIN'), outcomeController.generateInsights);
router.get('/analytics/admin', authenticate, authorize('ADMIN'), outcomeController.getAdminAnalytics);

// ==================== Export ====================
router.get('/export/all', authenticate, outcomeController.exportOutcomes);

// ==================== Dynamic ID Routes ====================
router.get('/:id', authenticate, outcomeController.getOutcomeById);
router.put('/:id', authenticate, validate(outcomeValidator), outcomeController.updateOutcome);
router.delete('/:id', authenticate, outcomeController.deleteOutcome);
router.post('/:id/interact', authenticate, outcomeController.trackInteraction);

export default router;