import { z } from 'zod';

import { RetentionCategory } from '../../../types/enums';

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

  page: z.preprocess((val) => {
    if (val === null || val === undefined) return 1;
    const num = parseInt(String(val), 10);
    return Number.isNaN(num) ? 1 : num;
  }, z.number().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (val === null || val === undefined) return 20;
    const num = parseInt(String(val), 10);
    return Number.isNaN(num) ? 20 : num;
  }, z.number().min(1).max(100).default(20)),
});

export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;

export const UpdateRetentionSchema = z.object({
  category: z.nativeEnum(RetentionCategory),
  retentionDays: z.number().min(1).max(3650), // up to 10 years
});

export type UpdateRetentionDto = z.infer<typeof UpdateRetentionSchema>;

export const RequestAuditExportSchema = z.object({
  exportType: z.enum(['CSV', 'EXCEL', 'PDF', 'JSON']),
  filters: AuditQuerySchema.optional(),
});

export type RequestAuditExportDto = z.infer<typeof RequestAuditExportSchema>;

export const AuditLogIdParamSchema = z.object({
  id: z.string().uuid('Invalid audit log ID format'),
});

export type AuditLogIdParamDto = z.infer<typeof AuditLogIdParamSchema>;

export const CorrelationIdParamSchema = z.object({
  correlationId: z.string().min(1, 'Correlation ID is required'),
});

export type CorrelationIdParamDto = z.infer<typeof CorrelationIdParamSchema>;

export const RequestIdParamSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
});

export type RequestIdParamDto = z.infer<typeof RequestIdParamSchema>;

export const SecurityEventsQuerySchema = z.object({
  page: z.preprocess((val) => {
    if (val === null || val === undefined) return 1;
    const num = parseInt(String(val), 10);
    return Number.isNaN(num) ? 1 : num;
  }, z.number().min(1).default(1)),
  limit: z.preprocess((val) => {
    if (val === null || val === undefined) return 20;
    const num = parseInt(String(val), 10);
    return Number.isNaN(num) ? 20 : num;
  }, z.number().min(1).max(100).default(20)),
});

export type SecurityEventsQueryDto = z.infer<typeof SecurityEventsQuerySchema>;
