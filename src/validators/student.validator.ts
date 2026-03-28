// backend/src/validators/student.validator.ts
import { z } from 'zod';

export const createStudentValidator = z.object({
  userId: z.string().min(1, 'User ID is required'),
  registrationNumber: z.string().min(1, 'Registration Number is required'),
  name: z.string().min(1, 'Name is required'),
  programId: z.string().min(1, 'Program ID is required'),
  trackId: z.string().min(1, 'Track ID is required'),
  mentorId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED']).optional(),
  joinDate: z.string().or(z.date()).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const updateStudentValidator = z.object({
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  programId: z.string().optional(),
  trackId: z.string().optional(),
  mentorId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  progress: z.number().min(0).max(100).optional()
});
