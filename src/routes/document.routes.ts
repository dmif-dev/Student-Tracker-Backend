// backend/src/routes/document.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  documentValidator,
  folderValidator,
  permissionValidator
} from '../validators/document.validator.js';

const router = Router();
const documentController = new DocumentController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/zip'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type') as any, false);
    }
  }
});

// ==================== Document CRUD ====================
router.post(
  '/upload',
  authenticate,
  authorize('ADMIN', 'MENTOR'),
  upload.single('file'),
  validate(documentValidator),
  documentController.uploadDocument
);

router.get('/', authenticate, documentController.getDocuments);
router.get('/stats', authenticate, authorize('ADMIN'), documentController.getDocumentStats);
router.get('/:id', authenticate, documentController.getDocumentById);
router.put('/:id', authenticate, authorize('ADMIN', 'MENTOR'), documentController.updateDocument);
router.delete('/:id', authenticate, authorize('ADMIN', 'MENTOR'), documentController.deleteDocument);

// ==================== Document Access ====================
router.get('/:id/download', authenticate, documentController.downloadDocument);
router.get('/:id/view', authenticate, documentController.viewDocument);

// ==================== Permission Management ====================
router.get('/:id/permissions', authenticate, authorize('ADMIN', 'MENTOR'), documentController.getDocumentPermissions);
router.post('/:id/permissions', authenticate, authorize('ADMIN', 'MENTOR'), validate(permissionValidator), documentController.grantPermission);
router.delete('/:id/permissions/:studentId', authenticate, authorize('ADMIN', 'MENTOR'), documentController.revokePermission);
router.post('/:id/permissions/bulk', authenticate, authorize('ADMIN', 'MENTOR'), documentController.grantBulkPermissions);

// ==================== Folder Management ====================
router.post('/folders', authenticate, authorize('ADMIN', 'MENTOR'), validate(folderValidator), documentController.createFolder);
router.get('/folders', authenticate, documentController.getFolders);
router.post('/folders/:folderId/documents/:documentId', authenticate, authorize('ADMIN', 'MENTOR'), documentController.addDocumentToFolder);
router.delete('/folders/:folderId/documents/:documentId', authenticate, authorize('ADMIN', 'MENTOR'), documentController.removeDocumentFromFolder);

export default router;