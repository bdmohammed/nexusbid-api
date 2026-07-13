import { z } from 'zod';

export const BlockUserDto = z.object({
  isBlocked: z.boolean(),
});
export type BlockUserDto = z.infer<typeof BlockUserDto>;

export const ListUsersQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  accountType: z.enum(['user', 'admin']).optional(),
  status: z.enum(['ACTIVE', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'SUSPENDED', 'BLOCKED', 'ARCHIVED']).optional(),
  country: z.string().optional(),
  verified: z.preprocess((val) => val === 'true' || val === true || val === '1', z.boolean()).optional(),
  dateFrom: z.string().optional(), // Using optional string for dynamic date parses
  dateTo: z.string().optional(),
  planId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});
export type ListUsersQueryDto = z.infer<typeof ListUsersQueryDto>;

export const CreateAdminDto = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  roleIds: z.array(z.string().uuid()).min(1, 'At least one active role must be assigned'),
});
export type CreateAdminDto = z.infer<typeof CreateAdminDto>;

export const UpdatePlanDto = z.object({
  name: z.string().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  durationDays: z.number().int().min(1).optional(),
  paypalPlanId: z.string().nullable().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  planType: z.enum(['all-access', 'state', 'country', 'category', 'bundle']).optional(),
  targetStateId: z.string().uuid().nullable().optional(),
  targetCountry: z.string().nullable().optional(),
  targetCategoryId: z.string().uuid().nullable().optional(),
  bundleSize: z.number().int().min(1).nullable().optional(),
  trialDays: z.number().int().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
});
export type UpdatePlanDto = z.infer<typeof UpdatePlanDto>;

export const CreatePlanDto = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  paypalPlanId: z.string().nullable().optional(),
  features: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  isRecurring: z.boolean().default(false),
  planType: z.enum(['all-access', 'state', 'country', 'category', 'bundle']).default('all-access'),
  targetStateId: z.string().uuid().nullable().optional(),
  targetCountry: z.string().nullable().optional(),
  targetCategoryId: z.string().uuid().nullable().optional(),
  bundleSize: z.number().int().min(1).nullable().optional(),
  trialDays: z.number().int().min(0).default(0),
  discountPercentage: z.number().int().min(0).max(100).default(0),
});
export type CreatePlanDto = z.infer<typeof CreatePlanDto>;

export const AnalyticsQueryDto = z.object({
  groupBy: z.enum(['day', 'month']).default('day'),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type AnalyticsQueryDto = z.infer<typeof AnalyticsQueryDto>;



export const CreateStateDto = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Za-z0-9-]+$/, 'State code must be alphanumeric or contain hyphens'),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  type: z.enum(['state', 'territory', 'federal']),
  country: z.string().min(1).max(100).default('United States').optional(),
});
export type CreateStateDto = z.infer<typeof CreateStateDto>;

export const UpdateStateDto = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Za-z0-9-]+$/, 'State code must be alphanumeric or contain hyphens').optional(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  type: z.enum(['state', 'territory', 'federal']).optional(),
  country: z.string().min(1).max(100).optional(),
});
export type UpdateStateDto = z.infer<typeof UpdateStateDto>;

export const BatchStateItemDto = z.object({
  action: z.enum(['upsert', 'delete']).default('upsert'),
  code: z.string().min(1).max(20).regex(/^[A-Za-z0-9-]+$/, 'State code must be alphanumeric or contain hyphens'),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  type: z.enum(['state', 'territory', 'federal']).optional(),
  country: z.string().min(1).max(100).optional(),
}).refine(data => {
  if (data.action === 'upsert' && (!data.name || !data.type)) {
    return false;
  }
  return true;
}, {
  message: 'Name and type are required for upsert operation',
  path: ['name'],
});
export type BatchStateItemDto = z.infer<typeof BatchStateItemDto>;

export const BatchStateDto = z.array(BatchStateItemDto);
export type BatchStateDto = z.infer<typeof BatchStateDto>;

export const StateQueryDto = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['state', 'territory', 'federal']).optional(),
  country: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type StateQueryDto = z.infer<typeof StateQueryDto>;

export const CreateUserNoteDto = z.object({
  note: z.string().min(1, 'Note content cannot be empty'),
});
export type CreateUserNoteDto = z.infer<typeof CreateUserNoteDto>;

export const UpdateUserDetailDto = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  companyName: z.string().max(160).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  status: z.enum(['active', 'pending_email_verification', 'pending_approval', 'rejected', 'suspended', 'archived']).optional(),
  isBlocked: z.boolean().optional(),
});
export type UpdateUserDetailDto = z.infer<typeof UpdateUserDetailDto>;

export const ImpersonateUserDto = z.object({
  reason: z.string().min(3, 'A valid reason of at least 3 characters is required to impersonate'),
});
export type ImpersonateUserDto = z.infer<typeof ImpersonateUserDto>;



