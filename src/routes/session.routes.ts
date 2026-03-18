// backend/src/routes/session.routes.ts
import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { 
  sessionValidator, 
  sessionNoteValidator, 
  sessionUpdateValidator 
} from '../validators/session.validator.js';

const router = Router();
const sessionController = new SessionController();

// ==================== Session CRUD ====================
router.post('/', authenticate, validate(sessionValidator), sessionController.scheduleSession);
router.get('/upcoming', authenticate, sessionController.getUpcomingSessions);
router.get('/history', authenticate, sessionController.getSessionHistory);
router.get('/calendar', authenticate, sessionController.getCalendarEvents);
router.get('/stats', authenticate, sessionController.getSessionStats);
router.get('/:id', authenticate, sessionController.getSessionById);
router.put('/:id', authenticate, validate(sessionUpdateValidator), sessionController.updateSession);
router.delete('/:id/cancel', authenticate, sessionController.cancelSession);

// ==================== Session Notes ====================
router.post('/:id/notes', authenticate, validate(sessionNoteValidator), sessionController.addSessionNotes);
router.get('/:id/notes', authenticate, sessionController.getSessionNotes);

// ==================== Filtered Lists ====================
router.get('/mentor/:mentorId', authenticate, sessionController.getSessionsByMentor);
router.get('/student/:studentId', authenticate, sessionController.getSessionsByStudent);

// ==================== Admin Only ====================
router.get('/admin/all', authenticate, authorize('ADMIN'), sessionController.getAllSessions);

export default router;