import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily'),
  country: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  currency: z.string().optional(),
  tenderType: z.string().optional(),
  tenderStatus: z.string().optional(),
  procurementType: z.string().optional(),
  device: z.string().optional(),
  browser: z.string().optional(),
});

export const SaveDashboardLayoutSchema = z.object({
  widgets: z.array(z.string()).default([]),
  filters: z.record(z.string(), z.any()).default({}),
  theme: z.string().default('default'),
  favorites: z.array(z.string()).default([]),
});

export const CreateScheduledReportSchema = z.object({
  reportName: z.string().min(3).max(150),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  timezone: z.string().default('UTC'),
  filters: z.record(z.string(), z.any()).default({}),
  recipients: z.object({
    users: z.array(z.string().uuid()).optional(),
    roles: z.array(z.string().uuid()).optional(),
    emails: z.array(z.string().email()).optional(),
    webhooks: z.array(z.string().url()).optional(),
  }),
});

export const RequestExportSchema = z.object({
  exportType: z.enum(['tenders', 'bids', 'financial', 'users', 'vendors', 'traffic', 'categories', 'system']),
  filters: z.record(z.string(), z.any()).default({}),
});

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;
export type SaveDashboardLayoutDto = z.infer<typeof SaveDashboardLayoutSchema>;
export type CreateScheduledReportDto = z.infer<typeof CreateScheduledReportSchema>;
export type RequestExportDto = z.infer<typeof RequestExportSchema>;
