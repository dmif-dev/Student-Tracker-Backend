// backend/src/routes/import.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ImportService } from '../services/import.service.js';

const router = Router();
const importService = new ImportService();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/students',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await importService.importStudentsFromCSV(
        req.file.buffer,
        req.user?.id || ''
      );

      res.json(result);
    } catch (error) {
      console.error('Import students error:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  }
);

router.post(
  '/outcomes',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await importService.importOutcomesFromCSV(
        req.file.buffer,
        req.user?.id || ''
      );

      res.json(result);
    } catch (error) {
      console.error('Import outcomes error:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  }
);

export default router;