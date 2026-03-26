// backend/src/validators/outcome.validator.ts
import { z } from 'zod';

export const outcomeValidator = z.object({
  type: z.enum(['PATENT', 'PAPER', 'STARTUP', 'CERTIFICATION', 'PROJECT']),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  studentId: z.string(),
  mentorId: z.string().optional(),
  status: z.enum(['PENDING', 'FILED', 'PUBLISHED', 'GRANTED', 'COMPLETED']).default('PENDING'),
  date: z.string().or(z.date()),
  program: z.enum(['G_GMP', 'G_CMP', 'E_TIP', 'PCP']),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  impact: z.string().optional(),
  externalUrl: z.string().url().optional(),
  files: z.array(z.string()).optional()
});

export const patentValidator = outcomeValidator.merge(z.object({
  metadata: z.object({
    applicationNumber: z.string().optional(),
    filingDate: z.string().or(z.date()).optional(),
    publicationDate: z.string().or(z.date()).optional(),
    grantDate: z.string().or(z.date()).optional(),
    jurisdiction: z.string().optional(),
    inventors: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    patentNumber: z.string().optional()
  }).optional()
}));

export const paperValidator = outcomeValidator.merge(z.object({
  metadata: z.object({
    journal: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    doi: z.string().optional(),
    issn: z.string().optional(),
    publisher: z.string().optional(),
    coAuthors: z.array(z.string()).optional(),
    citations: z.number().optional()
  }).optional()
}));

export const startupValidator = outcomeValidator.merge(z.object({
  metadata: z.object({
    companyName: z.string().optional(),
    registrationNumber: z.string().optional(),
    incorporationDate: z.string().or(z.date()).optional(),
    fundingStage: z.string().optional(),
    fundingAmount: z.number().optional(),
    investors: z.array(z.string()).optional(),
    website: z.string().url().optional(),
    teamSize: z.number().optional()
  }).optional()
}));

export const certificationValidator = outcomeValidator.merge(z.object({
  metadata: z.object({
    certificateNumber: z.string().optional(),
    issuingBody: z.string().optional(),
    expiryDate: z.string().or(z.date()).optional(),
    level: z.string().optional(),
    score: z.number().optional(),
    credits: z.number().optional()
  }).optional()
}));

export const outcomeFilterValidator = z.object({
  studentId: z.string().optional(),
  mentorId: z.string().optional(),
  program: z.enum(['G_GMP', 'G_CMP', 'E_TIP', 'PCP']).optional(),
  type: z.enum(['PATENT', 'PAPER', 'STARTUP', 'CERTIFICATION', 'PROJECT']).optional(),
  status: z.enum(['PENDING', 'FILED', 'PUBLISHED', 'GRANTED', 'COMPLETED']).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional()
});

export const analyticsRequestValidator = z.object({
  program: z.enum(['G_GMP', 'G_CMP', 'E_TIP', 'PCP']).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  metrics: z.array(z.enum(['count', 'rate', 'trend', 'comparison'])).optional()
});