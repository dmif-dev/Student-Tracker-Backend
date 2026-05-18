// backend/src/validators/report.validator.ts
import { z } from 'zod';

export const reportValidator = z.object({
  studentIds: z.array(z.string()).optional(),
  mentorIds: z.array(z.string()).optional(),
  programs: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().or(z.date()),
    end: z.string().or(z.date()),
  }),
  includeCharts: z.boolean().optional(),
  includeTables: z.boolean().optional(),
  includeAttendance: z.boolean().optional(),
  includeActivities: z.boolean().optional(),
  includeProgress: z.boolean().optional(),
  includeAssignments: z.boolean().optional(),
  includeOutcomes: z.boolean().optional(),
}).refine(data => new Date(data.dateRange.start) <= new Date(data.dateRange.end), {
  message: 'End date must be after start date',
  path: ['dateRange.end']
});

export const scheduleValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  config: z.any(),
  recipients: z.array(z.string().email()).optional(),
  startDate: z.string().or(z.date()).optional()
});