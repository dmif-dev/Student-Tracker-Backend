import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { NotificationController } from '../controllers/notification.controller.js';

const router = Router();
const notificationController = new NotificationController();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.post('/', notificationController.addNotificationHandler.bind(notificationController));
router.post('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
