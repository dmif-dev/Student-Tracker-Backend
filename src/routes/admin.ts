import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AdminController } from '../controllers/admin.controller.js';

const router = Router();
const adminController = new AdminController();

// Apply admin protection to all routes in this file
router.use(authenticate, authorize('Admin'));

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Global Settings (using Admin's preferences)
router.get('/settings', adminController.getGlobalSettings);
router.put('/settings', adminController.updateGlobalSettings);

export default router;
