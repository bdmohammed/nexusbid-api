import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const statePermissionModule: PermissionModuleSeed = {
  name: 'Locations',
  key: PermissionModules.STATE,
  displayOrder: 14,
  description: 'Locations and geography management module.',
  isSystemModule: true,
  isActive: true,
} as const;

export const StatePermissions = {
  MANAGE: definePermission(PermissionModules.STATE, PermissionActions.MANAGE, {
    name: 'Manage Locations',
    description: 'Manage geographical states, territories, and countries.',
    displayOrder: 1,
    isActive: true,
  }),
} as const;
