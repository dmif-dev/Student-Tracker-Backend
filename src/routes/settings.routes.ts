// backend/src/routes/settings.routes.ts
import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const controller = new SettingsController();

router.get('/preferences', authenticate, controller.getPreferences);
router.put('/preferences', authenticate, controller.updatePreferences);
router.put('/profile', authenticate, controller.updateProfile);
router.get('/mentor/preferences', authenticate, authorize('MENTOR'), controller.getMentorPreferences);
router.put('/mentor/preferences', authenticate, authorize('MENTOR'), controller.updateMentorPreferences);

export default router;