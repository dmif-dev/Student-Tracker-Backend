import { z } from 'zod';

export const createStudentValidator = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  registrationNumber: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  programId: z.string().optional(),
  program: z.string().optional(),
  trackId: z.string().optional(),
  track: z.string().optional(),
  mentorId: z.string().optional(),
  mentor: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'active', 'inactive', 'pending', 'completed']).optional(),
  joinDate: z.string().or(z.date()).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const updateStudentValidator = z.object({
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  programId: z.string().optional(),
  program: z.string().optional(),
  trackId: z.string().optional(),
  track: z.string().optional(),
  mentorId: z.string().optional().nullable(),
  mentor: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'active', 'inactive', 'pending', 'completed']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  progress: z.number().min(0).max(100).optional(),
  joinDate: z.string().or(z.date()).optional()
});
