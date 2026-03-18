// backend/src/validators/progress.validator.ts
import { z } from 'zod';

export const progressValidator = z.object({
  studentId: z.string(),
  date: z.string().or(z.date()),
  notes: z.string().optional(),
  topicsCovered: z.array(z.string()).min(1, 'At least one topic required'),
  attendanceStatus: z.enum(['PRESENT', 'ABSENT', 'LATE']).default('PRESENT'),
  performanceRating: z.number().min(1).max(10).optional(),
  attachments: z.array(z.string()).optional()
});