import { z } from 'zod';

export const RegisterDto = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z.string().max(160).trim().optional(),
  country: z.string().max(100).trim().optional(),
});
export type RegisterDto = z.infer<typeof RegisterDto>;

export const LoginDto = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  captchaToken: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const ForgotPasswordDto = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDto>;

export const ResetPasswordDto = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordDto>;

export const VerifyEmailDto = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailDto>;

export const ResendVerificationDto = z.object({
  email: z.string().email().toLowerCase(),
});
export type ResendVerificationDto = z.infer<typeof ResendVerificationDto>;

export const EmailChangeDto = z.object({
  email: z.string().email().toLowerCase(),
});
export type EmailChangeDto = z.infer<typeof EmailChangeDto>;

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordDto>;
