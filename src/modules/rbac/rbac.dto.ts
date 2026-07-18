import { z } from 'zod';

import type { RoleStatus, RoleVersionStatus } from '@/types/enums';

export const ListRolesQuerySchema = z.object({
  deleted: z
    .preprocess((val) => {
      if (val === 'true' || val === '1' || val === true) return true;
      if (val === 'false' || val === '0' || val === false) return false;
      return val;
    }, z.boolean())
    .optional()
    .default(false),
});
export type ListRolesQueryDto = z.infer<typeof ListRolesQuerySchema>;

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;

export const RoleIdParamSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
});
export type RoleIdParamDto = z.infer<typeof RoleIdParamSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().nullable().optional().default(null),
  permissionKeys: z.array(z.string()).min(1, 'At least one permission must be selected'),
});
export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().nullable().optional().default(null),
  permissionKeys: z.array(z.string()).min(1, 'At least one permission must be selected'),
});
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

export const DuplicateRoleBodySchema = z.object({
  name: z.string().min(1, 'Role name is required'),
});
export type DuplicateRoleBodyDto = z.infer<typeof DuplicateRoleBodySchema>;

export const AssignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  expiresAt: z.string().nullable().optional().default(null),
});
export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;

export const CompareVersionsParamsSchema = z.object({
  id: z.string().uuid('Invalid role ID'),
  v1: z.coerce.number().int().positive('First version must be a positive integer'),
  v2: z.coerce.number().int().positive('Second version must be a positive integer'),
});
export type CompareVersionsParamsDto = z.infer<typeof CompareVersionsParamsSchema>;

export const VersionIdParamSchema = z.object({
  versionId: z.string().uuid('Invalid version ID'),
});
export type VersionIdParamDto = z.infer<typeof VersionIdParamSchema>;

export const SubmitReviewSchema = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1, 'At least one reviewer is required'),
});
export type SubmitReviewDto = z.infer<typeof SubmitReviewSchema>;

export const ReviewIdParamSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
});
export type ReviewIdParamDto = z.infer<typeof ReviewIdParamSchema>;

export const ReviewActionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().max(500).optional().default(''),
});
export type ReviewActionDto = z.infer<typeof ReviewActionSchema>;

export interface SuccessResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const SetupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.email('Please enter a valid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
});
export type SetupDto = z.infer<typeof SetupSchema>;

export interface RoleDetails {
  id: string;
  slug: string;
  status: RoleStatus;
  isSystemRole: boolean;
  isDefaultRole: boolean;
  activeVersionId: string | null;
  name: string;
  description: string;
  version: number;
  permissions?: string[];
  permissionKeys?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateRoleResult {
  roleId: string;
  versionId: string;
  version: number;
  name: string;
  status: RoleVersionStatus;
}

export interface UpdateRoleResult {
  roleId: string;
  versionId: string;
  version: number;
  status: RoleVersionStatus;
}

export interface CompareVersionsResult {
  v1: {
    version: number;
    name: string;
    description: string;
    status: RoleVersionStatus;
  };
  v2: {
    version: number;
    name: string;
    description: string;
    status: RoleVersionStatus;
  };
  diff: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
}

export interface RoleStatsResult {
  totalRoles: number;
  activeRoles: number;
  pendingReviews: number;
  moduleDistribution: { module: string; count: number | string }[];
}

export interface ExportRoleData {
  roleId: string;
  slug: string;
  status: RoleStatus;
  isSystemRole: boolean;
  name: string;
  description: string;
  version: number;
  permissions: string[];
}

export interface GroupedPermissionModule {
  id: string;
  name: string;
  slug: string;
  permissions: {
    id: string;
    key: string;
    name: string;
    action: string;
    description: string | null;
  }[];
}
