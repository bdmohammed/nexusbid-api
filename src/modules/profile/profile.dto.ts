import { z } from 'zod';

export const UpdateProfileDto = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  country: z.string().max(100).nullable().optional(),
});

export const UpdateAvatarDto = z.object({
  avatarUrl: z.string().url('Invalid avatar URL'),
});

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const UpdatePreferencesDto = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  marketing: z.boolean().optional(),
  security: z.boolean().optional(),
  tender: z.boolean().optional(),
  newsletter: z.boolean().optional(),
});

export const RequestChangeDto = z.object({
  field: z.string().min(1, 'Field name is required'),
  value: z.string().min(1, 'New value is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
});
