import { z } from 'zod';

export const RegisterSchema = z.object({
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
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  captchaToken: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export const ResendVerificationSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;

export const EmailChangeSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type EmailChangeDto = z.infer<typeof EmailChangeSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const OwnerReviewSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  action: z.enum(['approve', 'reject'], { message: "Action must be either 'approve' or 'reject'" }),
});
export type OwnerReviewDto = z.infer<typeof OwnerReviewSchema>;

export const VerifyBootstrapTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type VerifyBootstrapTokenDto = z.infer<typeof VerifyBootstrapTokenSchema>;

export const ApproveBootstrapAdminSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  action: z.enum(['approve', 'reject']).optional().default('approve'),
});
export type ApproveBootstrapAdminDto = z.infer<typeof ApproveBootstrapAdminSchema>;

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;

export interface UserSessionDto {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export const OAuthProviderSchema = z.object({
  provider: z.enum(['google', 'github', 'microsoft']),
});
export type OAuthProviderDto = z.infer<typeof OAuthProviderSchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  state: z.string().min(1, 'State is required'),
});
export type OAuthCallbackQueryDto = z.infer<typeof OAuthCallbackQuerySchema>;
