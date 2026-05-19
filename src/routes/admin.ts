import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

import { AdminSettingsController } from '../controllers/admin-settings.controller.js';
import { AdminNotificationsController } from '../controllers/admin-notifications.controller.js';
import { AdminDocumentsController } from '../controllers/admin-documents.controller.js';

const router = Router();
const controller = new AdminSettingsController();
const notificationsController = new AdminNotificationsController();
const documentsController = new AdminDocumentsController();

// Apply admin protection to all routes in this file
// router.use(authenticate, authorize('Admin'));
// Note: Assuming authenticate/authorize middleware is working. To avoid breaking testing locally, we'll just keep it or adjust based on current app state.
// If the app uses different capitalization for roles like 'ADMIN', we might need to adjust it, but I'll leave what was there.
router.use(authenticate, authorize('ADMIN'));

// --- Settings: General ---
router.get('/settings/general', controller.getGeneralSettings);
router.put('/settings/general', controller.updateGeneralSettings);

// --- Settings: Notifications ---
router.get('/settings/notifications', controller.getNotificationSettings);
router.put('/settings/notifications', controller.updateNotificationSettings);

// --- Settings: Security ---
router.get('/settings/security', controller.getSecuritySettings);
router.put('/settings/security', controller.updateSecuritySettings);

// --- Users & Roles ---
router.get('/users', controller.getUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.patch('/users/:id/role', controller.updateUserRole);
router.patch('/users/:id/status', controller.updateUserStatus);
router.delete('/users/:id', controller.deleteUser);

// --- Email Templates ---
router.get('/settings/email-templates', controller.getEmailTemplates);
router.get('/settings/email-templates/:id', controller.getEmailTemplate);
router.put('/settings/email-templates/:id', controller.updateEmailTemplate);

// --- API Keys ---
router.get('/settings/api-keys', controller.getApiKeys);
router.post('/settings/api-keys', controller.createApiKey);
router.delete('/settings/api-keys/:id', controller.deleteApiKey);

// --- Backups ---
router.get('/settings/backups', controller.getBackups);
router.post('/settings/backups', controller.createBackup);
router.post('/settings/backups/:id/restore', controller.restoreBackup);
router.delete('/settings/backups/:id', controller.deleteBackup);
router.get('/settings/backup-config', controller.getBackupSettings);
router.put('/settings/backup-config', controller.updateBackupSettings);

// --- Notifications ---
router.get('/notifications', notificationsController.getNotifications);
router.get('/alerts', notificationsController.getAlerts);
router.post('/notifications', notificationsController.createNotification);
router.put('/notifications/read-all', notificationsController.markAllAsRead);
router.put('/notifications/:id/read', notificationsController.markAsRead);
router.delete('/notifications/:id', notificationsController.deleteNotification);
router.delete('/alerts/:id', notificationsController.dismissAlert);

// --- Documents ---
router.get('/documents', documentsController.getDocuments);
router.post('/documents/upload', documentsController.uploadDocument);
router.put('/documents/:id', documentsController.updateDocument);
router.delete('/documents/:id', documentsController.deleteDocument);
router.put('/documents/:id/permissions', documentsController.updatePermissions);
router.post('/documents/:id/track-view', documentsController.trackView);
router.post('/documents/:id/track-download', documentsController.trackDownload);

router.get('/all-users', (req: AuthRequest, res) => {
  res.json({
    message: 'Admin access: list of all users',
    data: [
      { id: 1, email: 'student@example.com', role: 'Student' },
      { id: 2, email: 'mentor@example.com', role: 'Mentor' }
    ]
  });
});

router.post('/manage-system', (req: AuthRequest, res) => {
  res.json({ message: 'System configuration updated by Admin' });
});

export default router;
