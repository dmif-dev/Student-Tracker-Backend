// backend/src/routes/mentors.routes.ts
import { Router } from 'express';
import { MentorController } from '../controllers/mentor.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { mentorValidator } from '../validators/mentor.validator.js';

const router = Router();
const mentorController = new MentorController();

// Only Admins can comprehensively manage the mentor roster
router.use(authenticate, authorize('ADMIN'));

router.get('/', mentorController.getAllMentors);
// Create mentor requires a different validation since they need to supply an email that might create a user account
// For now we'll skip validation or mock it if there's no specific admin-create validator
router.post('/', mentorController.createMentor);
router.get('/:id', mentorController.getMentorById);
router.get('/:id/performance', mentorController.getMentorPerformanceAdmin);
router.put('/:id', validate(mentorValidator), mentorController.updateMentor);
router.delete('/:id', mentorController.deleteMentor);

export default router;
