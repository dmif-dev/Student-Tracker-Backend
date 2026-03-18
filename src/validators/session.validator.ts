// backend/src/validators/session.validator.ts
import { z } from 'zod';

export const sessionValidator = z.object({
  studentId: z.string(),
  mentorId: z.string(),
  date: z.string().or(z.date()),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  topic: z.string().min(2, 'Topic must be at least 2 characters'),
  meetingLink: z.string().url().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).default('SCHEDULED')
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const sessionNoteValidator = z.object({
  content: z.string().min(10, 'Notes must be at least 10 characters'),
  topics: z.array(z.string()).optional(),
  duration: z.number().min(1).max(180).optional(),
  feedback: z.string().optional(),
  nextSteps: z.string().optional(),
  resources: z.array(z.string().url()).optional()
});

export const sessionUpdateValidator = z.object({
  date: z.string().or(z.date()).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  topic: z.string().min(2, 'Topic must be at least 2 characters').optional(),
  meetingLink: z.string().url().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).optional()
}).refine(data => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});