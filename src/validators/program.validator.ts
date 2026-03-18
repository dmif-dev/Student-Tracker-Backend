// backend/src/validators/program.validator.ts
import { z } from 'zod';

export const programValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  icon: z.string().optional(),
  color: z.string().optional(),
  hasMentors: z.boolean().optional(),
  hasOutcomes: z.boolean().optional(),
  duration: z.string().optional()
});

export const trackValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  requiresMentor: z.boolean().default(false)
});