// backend/src/validators/report.validator.ts
import { z } from 'zod';

export const reportValidator = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student ID required'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  includeTopics: z.boolean().optional()
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate']
});

export const scheduleValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  config: z.object({
    studentIds: z.array(z.string()).optional(),
    programId: z.string().optional(),
    includeTopics: z.boolean().optional()
  }),
  recipients: z.array(z.string().email()).optional(),
  startDate: z.string().or(z.date()).optional()
});