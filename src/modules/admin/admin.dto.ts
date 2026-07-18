import { z } from 'zod';

import type { SubscriptionStatus, TransactionStatus } from '@/types/enums';
import { PlanType, StateType, UserStatus } from '@/types/enums';

export const BlockUserSchema = z.object({
  isBlocked: z.boolean(),
});
export type BlockUserDto = z.infer<typeof BlockUserSchema>;

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  accountType: z.enum(['user', 'admin']).optional(),
  status: z.enum(UserStatus).optional(),
  country: z.string().optional(),
  verified: z
    .preprocess((val) => {
      if (val === true || val === 'true' || val === '1') {
        return true;
      }

      if (val === false || val === 'false' || val === '0') {
        return false;
      }

      return val;
    }, z.boolean())
    .optional(),
  dateFrom: z.string().optional(), // Using optional string for dynamic date parses
  dateTo: z.string().optional(),
  planId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  approvalStatus: z.enum(UserStatus).optional(),
});
export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>;

export const CreateAdminSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  roleIds: z.array(z.string().uuid()).min(1, 'At least one active role must be assigned'),
});
export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;

export const UpdatePlanSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  durationDays: z.number().int().min(1).optional(),
  paypalPlanId: z.string().nullable().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  planType: z.enum(PlanType).optional(),
  targetStateId: z.coerce.number().int().nullable().optional(),
  targetCountry: z.string().nullable().optional(),
  targetCategoryId: z.string().uuid().nullable().optional(),
  bundleSize: z.number().int().min(1).nullable().optional(),
  trialDays: z.number().int().min(0).optional(),
  discountPercentage: z.number().int().min(0).max(100).optional(),
});
export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  paypalPlanId: z.string().nullable().optional(),
  features: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  isRecurring: z.boolean().default(false),
  planType: z.enum(PlanType).default(PlanType.ALL_ACCESS),
  targetStateId: z.coerce.number().int().nullable().optional(),
  targetCountry: z.string().nullable().optional(),
  targetCategoryId: z.string().uuid().nullable().optional(),
  bundleSize: z.number().int().min(1).nullable().optional(),
  trialDays: z.number().int().min(0).default(0),
  discountPercentage: z.number().int().min(0).max(100).default(0),
});
export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;

export const AnalyticsQuerySchema = z.object({
  groupBy: z.enum(['day', 'month']).default('day'),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;

export const CreateCategorySchema = z.object({
  code: z
    .string()
    .regex(/^\d{3}$/, 'Category code must be exactly 3 digits')
    .optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  code: z
    .string()
    .regex(/^\d{3}$/, 'Category code must be exactly 3 digits')
    .optional(),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

export const BatchCategoryItemSchema = z
  .object({
    action: z.enum(['upsert', 'delete']).default('upsert'),
    code: z.string().regex(/^\d{3}$/, 'Category code must be exactly 3 digits'),
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'upsert' && !data.name) {
        return false;
      }
      return true;
    },
    {
      message: 'Name is required for upsert operation',
      path: ['name'],
    },
  );
export type BatchCategoryItemDto = z.infer<typeof BatchCategoryItemSchema>;

export const BatchCategorySchema = z.array(BatchCategoryItemSchema);
export type BatchCategoryDto = z.infer<typeof BatchCategorySchema>;

export const CategoryQuerySchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  createdBy: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  unusedOnly: z
    .preprocess((val) => {
      if (val === true || val === 'true' || val === '1') {
        return true;
      }

      if (val === false || val === 'false' || val === '0') {
        return false;
      }

      return val;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CategoryQueryDto = z.infer<typeof CategoryQuerySchema>;

export const UpdateStateSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStateDto = z.infer<typeof UpdateStateSchema>;

export const UpdateStateParamsSchema = z.object({
  id: z.string(),
});
export type UpdateStateParamsDto = z.infer<typeof UpdateStateParamsSchema>;

export const UpdateStateBodySchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStateBodyDto = z.infer<typeof UpdateStateBodySchema>;

export const UpdateCountryParamsSchema = z.object({
  id: z.string(),
});
export type UpdateCountryParamsDto = z.infer<typeof UpdateCountryParamsSchema>;

export const UpdateCountryBodySchema = z.object({
  isActive: z.boolean(),
});
export type UpdateCountryBodyDto = z.infer<typeof UpdateCountryBodySchema>;

export const StateQuerySchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(StateType).optional(),
  countryId: z.coerce.number().int().optional(),
  countryCode: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type StateQueryDto = z.infer<typeof StateQuerySchema>;

export const CreateUserNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty'),
});
export type CreateUserNoteDto = z.infer<typeof CreateUserNoteSchema>;

export const UpdateUserDetailSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  companyName: z.string().max(160).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  status: z.enum(UserStatus).optional(),
  isBlocked: z.boolean().optional(),
});
export type UpdateUserDetailDto = z.infer<typeof UpdateUserDetailSchema>;

export const ImpersonateUserSchema = z.object({
  reason: z.string().min(3, 'A valid reason of at least 3 characters is required to impersonate'),
});
export type ImpersonateUserDto = z.infer<typeof ImpersonateUserSchema>;

export const RejectAdminParamsSchema = z.object({
  id: z.uuid(),
});

export const RejectAdminBodySchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500),
});

export type RejectAdminParamsDto = z.infer<typeof RejectAdminParamsSchema>;
export type RejectAdminBodyDto = z.infer<typeof RejectAdminBodySchema>;

export const ApproveAdminParamsSchema = z.object({
  id: z.uuid({ message: 'Invalid administrator ID' }),
});

export const ApproveAdminBodySchema = z.object({
  roleId: z.uuid({ message: 'Invalid role ID' }),
});

export type ApproveAdminParamsDto = z.infer<typeof ApproveAdminParamsSchema>;
export type ApproveAdminBodyDto = z.infer<typeof ApproveAdminBodySchema>;

export const IdParamSchema = z.object({
  id: z.uuid('Invalid ID format'),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;

export const SessionParamSchema = z.object({
  id: z.uuid('Invalid user ID'),
  sessionId: z.uuid('Invalid session ID'),
});
export type SessionParamDto = z.infer<typeof SessionParamSchema>;

export const RoleParamSchema = z.object({
  id: z.uuid('Invalid user ID'),
  roleId: z.uuid('Invalid role ID'),
});
export type RoleParamDto = z.infer<typeof RoleParamSchema>;

export const PlanParamSchema = z.object({
  id: z.uuid('Invalid plan ID'),
});
export type PlanParamDto = z.infer<typeof PlanParamSchema>;

export const AssignUserRolesBodySchema = z.object({
  assignments: z
    .array(
      z.object({
        roleId: z.string().uuid('Invalid role ID'),
        expiresAt: z.string().nullable().optional(),
      }),
    )
    .min(1, 'At least one role assignment is required'),
});
export type AssignUserRolesBodyDto = z.infer<typeof AssignUserRolesBodySchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

export const ListSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'pending']).optional(),
});
export type ListSubscriptionsQueryDto = z.infer<typeof ListSubscriptionsQuerySchema>;

export interface PreviewPermissionResponseDto {
  moduleName: string;
  moduleSlug: string;
  permissions: {
    key: string;
    name: string;
    action: string;
    description: string | null;
    granted: boolean;
  }[];
}

export interface UserStatsDto {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  admins: number;
  customers: number;
  pendingVerification: number;
  pendingApprovalAdmins: number;
  subscribed: number;
  blocked: number;
  onlineNow: number;
  newToday: number;
  newThisMonth: number;
}

export interface UserOverviewDto {
  id: string;
  name: string;
  email: string;
  accountType: string;
  companyName: string | null;
  country: string | null;
  status: string;
  emailVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  approvedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  notesCount: number;
  stats: {
    createdTendersCount: number;
    downloadCount: number;
    wonTendersCount: number;
    lostTendersCount: number;
    documentsCount: number;
    loginsCount: number;
    storageUsedBytes: number;
  };
}

export interface UserSecurityDto {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  passwordChangedAt: Date | null;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  mustResetPassword: boolean;
}

export interface UserSessionDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserDeviceDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string;
  lastUsedAt: Date;
}

export interface UserRoleDetail {
  id: string;
  name: string;
  key: string;
  expiresAt?: Date | null;
  isSystemRole: boolean;
}

export interface UserRolesDto {
  assigned: UserRoleDetail[];
  available: Omit<UserRoleDetail, 'expiresAt'>[];
}

export interface UserTimelineEvent {
  event: string;
  timestamp: Date;
  description: string;
}

export interface UserSubscriptionOverviewDto {
  activeSubscription: {
    id: string;
    planName: string;
    status: SubscriptionStatus;
    startedAt: Date;
    expiresAt: Date;
  } | null;
  transactions: {
    id: string;
    amountCents: number;
    type: string;
    status: TransactionStatus;
    createdAt: Date;
  }[];
}

export interface UserNoteDetailDto {
  id: string;
  note: string;
  createdAt: Date;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface UserActivityDetailDto {
  id: string;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  timestamp: Date;
}

export interface RevenueAnalyticsResultDto {
  period: string;
  totalCents: string;
  count: string;
}

export interface UserGrowthResultDto {
  period: string;
  count: string;
}

export interface TopDownloadResultDto {
  id: string;
  title: string;
  slug: string;
  download_count: number;
}

export interface CategoryStatsDto {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  tendersCount: number;
}

export interface BatchCategoriesResultDto {
  created: number;
  updated: number;
  deleted: number;
}
