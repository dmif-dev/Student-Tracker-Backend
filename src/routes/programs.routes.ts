// backend/src/routes/programs.routes.ts
import { Router } from 'express';
import { ProgramController } from '../controllers/program.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { programValidator, trackValidator } from '../validators/program.validator.js';

const router = Router();
const programController = new ProgramController();

// Public endpoints (or broadly authenticated endpoints)
router.get('/', programController.getAllPrograms);
router.get('/compare', authenticate, programController.comparePrograms);
router.get('/:id', programController.getProgramById);
router.get('/:id/metrics', programController.getProgramMetrics);
router.get('/:programId/tracks', programController.getTracks);

// Admin-only endpoints
router.use(authenticate, authorize('ADMIN'));

// Program CRUD
router.post('/', validate(programValidator), programController.createProgram);
router.put('/:id', validate(programValidator), programController.updateProgram);
router.delete('/:id', programController.deleteProgram);

// Track CRUD
router.post('/:programId/tracks', validate(trackValidator), programController.createTrack);
router.put('/tracks/:trackId', validate(trackValidator), programController.updateTrack);
router.delete('/tracks/:trackId', programController.deleteTrack);

export default router;