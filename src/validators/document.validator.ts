// backend/src/validators/document.validator.ts
import { z } from 'zod';

// Helper to safely parse a JSON string
const parseJson = (val: unknown) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
};

// Normalise type values: accept lowercase or uppercase from the frontend
const normaliseType = (val: unknown) => {
  if (typeof val === 'string') return val.toUpperCase();
  return val;
};

// Normalise program values: replace hyphens with underscores (G-CMP -> G_CMP)
const normaliseProgram = (val: unknown) => {
  if (typeof val === 'string') return val.replace(/-/g, '_').toUpperCase();
  return val;
};

export const documentValidator = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  type: z.preprocess(normaliseType, z.enum(['LEARNING_MATERIAL', 'ASSIGNMENT_MATERIAL', 'PRE_READING_MATERIAL'])),
  program: z.preprocess(normaliseProgram, z.enum(['G_CMP', 'E_TIP'])),
  track: z.string().optional(),
  visibility: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['STUDENT_ONLY', 'MENTOR_ONLY', 'BOTH']).default('STUDENT_ONLY')
  ),
  metadata: z.preprocess(parseJson, z.object({
    dueDate: z.string().or(z.date()).optional(),
    points: z.number().optional(),
    readingTime: z.number().optional(),
    required: z.boolean().default(false),
    tags: z.array(z.string()).optional()
  }).optional()),
  studentIds: z.preprocess(parseJson, z.array(z.string()).optional()),
});

export const folderValidator = z.object({
  name: z.string().min(2, 'Folder name must be at least 2 characters'),
  description: z.string().optional(),
  program: z.preprocess(normaliseProgram, z.enum(['G_CMP', 'E_TIP'])),
  track: z.string().optional()
});

export const permissionValidator = z.object({
  studentId: z.string(),
  canView: z.boolean().default(true),
  canDownload: z.boolean().default(true)
});