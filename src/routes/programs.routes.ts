// backend/src/routes/test-programs.routes.ts (temporary test file)
import { Router } from 'express';
import { ProgramController } from '../controllers/program.controller.js';

const router = Router();
const programController = new ProgramController();

// Remove authentication for testing
router.get('/', programController.getAllPrograms);
router.get('/:id', programController.getProgramById);
router.get('/:id/metrics', programController.getProgramMetrics);

export default router;