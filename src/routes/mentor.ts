// import { Router } from 'express';
// import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

// const router = Router();

// // Apply Mentor or Admin protection
// router.use(authenticate, authorize(['Mentor']));

// router.get('/my-students', (req: AuthRequest, res) => {
//   res.json({
//     message: 'Mentor access: list of assigned students',
//     data: [
//       { name: 'John Doe', track: 'G-GMP' },
//       { name: 'Jane Smith', track: 'G-CMP' }
//     ]
//   });
// });

// export default router;

// backend/src/routes/mentor.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { MentorController } from '../controllers/mentor.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { 
  mentorValidator, 
  availabilityValidator, 
  mentorAssignmentValidator 
} from '../validators/mentor.validator.js';

const router = Router();
const mentorController = new MentorController();

// ==================== All mentor routes require authentication and MENTOR role ====================
router.use(authenticate, authorize('Mentor', 'Admin'));

// ==================== Profile & Account ====================
router.get('/profile', mentorController.getMentorById);
router.put('/profile', validate(mentorValidator), mentorController.updateMentor);
router.get('/stats', mentorController.getMentorStats);

// ==================== Student Management ====================
router.get('/students', mentorController.getAssignedStudents);
router.get('/students/:studentId', mentorController.getStudentById);
router.post('/students/:studentId/notes', mentorController.addStudentNotes);
router.post('/students/:studentId/assign', authorize('ADMIN'), mentorController.assignStudent);
router.delete('/students/:studentId/unassign', authorize('ADMIN'), mentorController.unassignStudent);

// ==================== Session Management ====================
router.get('/sessions', mentorController.getMentorSchedule);
router.get('/sessions/upcoming', mentorController.getUpcomingSessions);
router.post('/sessions', mentorController.scheduleSession);
router.put('/sessions/:sessionId', mentorController.updateSession);
router.delete('/sessions/:sessionId', mentorController.cancelSession);
router.post('/sessions/:sessionId/notes', mentorController.addSessionNotes);
router.get('/sessions/:sessionId/notes', mentorController.getSessionNotes);

// ==================== Availability Management ====================
router.get('/availability', mentorController.getAvailability);
router.post('/availability', validate(availabilityValidator), mentorController.addAvailability);
router.put('/availability/:id', validate(availabilityValidator), mentorController.updateAvailability);
router.delete('/availability/:id', mentorController.deleteAvailability);
router.post('/availability/bulk', mentorController.bulkAddAvailability);
router.get('/check-availability', mentorController.checkAvailability);

// ==================== Document Management ====================
router.get('/documents', mentorController.getDocuments);
router.post('/documents/upload', mentorController.uploadDocument);
router.get('/documents/:id', mentorController.getDocumentById);
router.delete('/documents/:id', mentorController.deleteDocument);

// ==================== Performance & Analytics ====================
router.get('/performance', mentorController.getMentorPerformance);
router.get('/students/progress', mentorController.getStudentsProgressSummary);
router.get('/analytics', mentorController.getAnalytics);

// ==================== Notifications ====================
router.get('/notifications', mentorController.getNotifications);
router.put('/notifications/:id/read', mentorController.markNotificationRead);
router.put('/notifications/read-all', mentorController.markAllNotificationsRead);

// ==================== Settings ====================
router.get('/settings', mentorController.getSettings);
router.put('/settings', mentorController.updateSettings);

export default router;