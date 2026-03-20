// backend/src/validators/document.validator.ts
import { z } from 'zod';

export const documentValidator = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  type: z.enum(['LEARNING_MATERIAL', 'ASSIGNMENT_MATERIAL', 'PRE_READING_MATERIAL']),
  program: z.enum(['G_CMP', 'E_TIP']),
  track: z.string().optional(),
  visibility: z.enum(['STUDENT_ONLY', 'MENTOR_ONLY', 'BOTH']).default('STUDENT_ONLY'),
  metadata: z.object({
    dueDate: z.string().or(z.date()).optional(),
    points: z.number().optional(),
    readingTime: z.number().optional(),
    required: z.boolean().default(false),
    tags: z.array(z.string()).optional()
  }).optional(),
  studentIds: z.array(z.string()).optional() // Students to grant access to
});

export const folderValidator = z.object({
  name: z.string().min(2, 'Folder name must be at least 2 characters'),
  description: z.string().optional(),
  program: z.enum(['G_CMP', 'E_TIP']),
  track: z.string().optional()
});

export const permissionValidator = z.object({
  studentId: z.string(),
  canView: z.boolean().default(true),
  canDownload: z.boolean().default(true)
});