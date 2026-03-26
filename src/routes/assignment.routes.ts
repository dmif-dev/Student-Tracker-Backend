// backend/src/routes/assignment.routes.ts
import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const controller = new AssignmentController();

router.post('/', authenticate, authorize('MENTOR'), controller.createAssignment);
router.get('/', authenticate, controller.getAssignments);
router.post('/:id/submit', authenticate, authorize('STUDENT'), controller.submitAssignment);
router.put('/submissions/:id/grade', authenticate, authorize('MENTOR'), controller.gradeSubmission);
router.get('/:assignmentId/submissions', authenticate, authorize('MENTOR'), controller.getSubmissions);

export default router;