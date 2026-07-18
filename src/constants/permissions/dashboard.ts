import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const dashboardPermissionModule: PermissionModuleSeed = {
  name: 'Dashboard',
  key: PermissionModules.DASHBOARD,
  displayOrder: 1,
  description: 'Dashboard Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const DashboardPermissions = {
  VIEW: definePermission(PermissionModules.DASHBOARD, PermissionActions.VIEW, {
    name: 'View Dashboard',
    description: 'Access the administration dashboard.',
    displayOrder: 1,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.DASHBOARD, PermissionActions.EXPORT, {
    name: 'Export Dashboard',
    description: 'Export dashboard charts.',
    displayOrder: 2,
    isActive: true,
  }),
} as const;
