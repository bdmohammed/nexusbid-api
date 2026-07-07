import { z } from 'zod';

export const AuditQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  userId: z.string().uuid().optional(),
  userEmail: z.string().optional(),
  role: z.string().optional(),
  
  // Advanced filters
  country: z.string().optional(),
  ipAddress: z.string().optional(),
  device: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  method: z.string().optional(),
  responseCode: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  correlationId: z.string().optional(),
  requestId: z.string().optional(),
  search: z.string().optional(),

  page: z.preprocess((val) => parseInt(val as string || '1', 10), z.number().min(1).default(1)),
  limit: z.preprocess((val) => parseInt(val as string || '20', 10), z.number().min(1).max(100).default(20)),
});

export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;

export const UpdateRetentionSchema = z.object({
  category: z.enum(['AUDIT', 'SECURITY', 'API']),
  retentionDays: z.number().min(1).max(3650), // up to 10 years
});

export type UpdateRetentionDto = z.infer<typeof UpdateRetentionSchema>;

export const RequestAuditExportSchema = z.object({
  exportType: z.enum(['CSV', 'EXCEL', 'PDF', 'JSON']),
  filters: AuditQuerySchema.optional(),
});

export type RequestAuditExportDto = z.infer<typeof RequestAuditExportSchema>;
