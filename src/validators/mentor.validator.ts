// backend/src/validators/mentor.validator.ts
import { z } from 'zod';

export const mentorValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  expertise: z.array(z.string()).min(1, 'At least one expertise area required'),
  programs: z.array(z.enum(['G_GMP', 'G_CMP', 'E_TIP'])).min(1, 'At least one program required'),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  joinDate: z.string().or(z.date()).optional()
});

export const availabilityValidator = z.object({
  mentorId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().or(z.date()).optional()
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const mentorAssignmentValidator = z.object({
  mentorId: z.string(),
  studentId: z.string(),
  action: z.enum(['assign', 'unassign'])
});