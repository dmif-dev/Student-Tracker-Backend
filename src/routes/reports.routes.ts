// backend/src/routes/reports.routes.ts
import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { reportValidator, scheduleValidator } from '../validators/report.validator.js';

const router = Router();
const reportController = new ReportController();

// Weekly reports
router.get('/weekly/student/:studentId', authenticate, reportController.getStudentWeeklyReports);
router.get('/weekly/:id', authenticate, reportController.getWeeklyReportById);
router.post('/weekly/generate/:studentId', authenticate, reportController.generateWeeklyReport);
router.delete('/weekly/:id', authenticate, reportController.deleteWeeklyReport);

// Report generation
router.post('/generate/custom', authenticate, validate(reportValidator), reportController.generateCustomReport);
router.get('/generate/program/:programId', authenticate, reportController.generateProgramReport);

// Scheduled reports
router.post('/schedule', authenticate, authorize('ADMIN'), validate(scheduleValidator), reportController.scheduleReport);
router.get('/scheduled', authenticate, reportController.getScheduledReports);
router.put('/scheduled/:id', authenticate, authorize('ADMIN'), reportController.updateScheduledReport);
router.delete('/scheduled/:id', authenticate, authorize('ADMIN'), reportController.deleteScheduledReport);

// Export
router.get('/export/:reportId', authenticate, reportController.exportReport);

export default router;