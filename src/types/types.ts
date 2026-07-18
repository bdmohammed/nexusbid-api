import type { PermissionActions } from '@/authorization/registry/types';
import type { PermissionModule } from '@/database/entities/PermissionModule';

export const PermissionModules = {
  DASHBOARD: 'dashboard',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  TENDER: 'tender',
  CATEGORY: 'category',
  BILLING: 'billing',
  SUPPORT: 'support',
  ANALYTICS: 'analytics',
  CMS: 'cms',
  NOTIFICATION: 'notification',
  AUDIT: 'audit',
  SYSTEM: 'system',
  STATE: 'state',
} as const;

export type PermissionModuleKey = (typeof PermissionModules)[keyof typeof PermissionModules];

export type PermissionKey = `${PermissionModuleKey}.${PermissionActions}`;

export const PermissionKeys: Record<string, PermissionKey> = {
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_EXPORT: 'dashboard.export',

  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',

  ROLE_VIEW: 'role.view',
} as const;

export type PermissionModuleSeed = Required<
  Pick<
    PermissionModule,
    'name' | 'key' | 'displayOrder' | 'description' | 'isSystemModule' | 'isActive'
  >
>;
