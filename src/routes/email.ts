import { Router } from 'express';
import { sendSessionNotification, sendDirectEmail, sendAcademicEmailController } from '../controllers/emailController.js';

const router = Router();

router.post('/notify-session', sendSessionNotification);
router.post('/send-email', sendDirectEmail);
router.post('/academic-email', sendAcademicEmailController);
router.post('/send-academic', sendAcademicEmailController);

export default router;
