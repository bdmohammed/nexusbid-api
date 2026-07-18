import { z } from 'zod';

export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['UNREAD', 'READ', 'ARCHIVED', 'DISMISSED']).optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
});

export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;

export const UpdatePreferencesBodySchema = z.object({
  email: z.record(z.string(), z.boolean()),
  inApp: z.record(z.string(), z.boolean()),
});

export type UpdatePreferencesBodyDto = z.infer<typeof UpdatePreferencesBodySchema>;

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationIdParamDto = z.infer<typeof NotificationIdParamSchema>;

export const ExecuteActionParamsSchema = z.object({
  id: z.string().uuid(),
  actionId: z.string().uuid(),
});

export type ExecuteActionParamsDto = z.infer<typeof ExecuteActionParamsSchema>;
