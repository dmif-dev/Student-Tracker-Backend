// // backend/src/routes/mentor.routes.ts
// import { Router } from 'express';
// import { MentorController } from '../controllers/mentor.controller.js';
// import { authenticate, authorize } from '../middleware/auth.js';
// import { validate } from '../middleware/validate.middleware.js';
// import {
//   mentorValidator,
//   availabilityValidator,
//   mentorAssignmentValidator
// } from '../validators/mentor.validator.js';

// const router = Router();
// const mentorController = new MentorController();

// // ==================== Basic CRUD Routes ====================
// router.get('/', authenticate, authorize('ADMIN'), mentorController.getAllMentors);
// router.get('/available', authenticate, mentorController.getAvailableMentors);
// router.get('/:id', authenticate, mentorController.getMentorById);
// router.post('/', authenticate, authorize('ADMIN'), validate(mentorValidator), mentorController.createMentor);
// router.put('/:id', authenticate, authorize('ADMIN'), validate(mentorValidator), mentorController.updateMentor);
// router.delete('/:id', authenticate, authorize('ADMIN'), mentorController.deleteMentor);

// // ==================== Availability Routes ====================
// router.get('/:mentorId/availability', authenticate, mentorController.getAvailability);
// router.post('/:mentorId/availability', authenticate, authorize('ADMIN', 'MENTOR'), validate(availabilityValidator), mentorController.addAvailability);
// router.post('/:mentorId/availability/bulk', authenticate, authorize('ADMIN', 'MENTOR'), mentorController.bulkAddAvailability);
// router.put('/availability/:id', authenticate, authorize('ADMIN', 'MENTOR'), validate(availabilityValidator), mentorController.updateAvailability);
// router.delete('/availability/:id', authenticate, authorize('ADMIN', 'MENTOR'), mentorController.deleteAvailability);

// // ==================== Student Assignment Routes ====================
// router.get('/:mentorId/students', authenticate, mentorController.getAssignedStudents);
// router.post('/:mentorId/students/:studentId/assign', authenticate, authorize('ADMIN'), mentorController.assignStudent);
// router.delete('/:mentorId/students/:studentId/unassign', authenticate, authorize('ADMIN'), mentorController.unassignStudent);

// // ==================== Statistics Routes ====================
// router.get('/:id/stats', authenticate, mentorController.getMentorStats);
// router.get('/:id/schedule', authenticate, mentorController.getMentorSchedule);
// router.get('/:id/performance', authenticate, mentorController.getMentorPerformance);
// router.get('/:mentorId/check-availability', authenticate, mentorController.checkAvailability);

// export default router;