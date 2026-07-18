import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  country: z.string().max(100).nullable().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const UpdateAvatarSchema = z.object({
  avatarUrl: z.url({
    error: 'Invalid avatar URL',
  }),
});
export type UpdateAvatarDto = z.infer<typeof UpdateAvatarSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const UpdatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  marketing: z.boolean().optional(),
  security: z.boolean().optional(),
  tender: z.boolean().optional(),
  newsletter: z.boolean().optional(),
});
export type UpdatePreferencesDto = z.infer<typeof UpdatePreferencesSchema>;

export const RequestChangeSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  value: z.string().min(1, 'New value is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
});
export type RequestChangeDto = z.infer<typeof RequestChangeSchema>;

export const ProfileSessionIdParamSchema = z.object({
  id: z.uuid(),
});
export type ProfileSessionIdParamDto = z.infer<typeof ProfileSessionIdParamSchema>;

export const PageLimitQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PageLimitQueryDto = z.infer<typeof PageLimitQuerySchema>;
