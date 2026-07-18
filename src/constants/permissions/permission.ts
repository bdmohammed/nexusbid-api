import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const permissionPermissionModule: PermissionModuleSeed = {
  name: 'Permission',
  key: PermissionModules.PERMISSION,
  displayOrder: 4,
  description: 'Permission Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const PermissionPermissions = {
  VIEW: definePermission(PermissionModules.PERMISSION, PermissionActions.VIEW, {
    name: 'View Permissions',
    description: 'View all permission modules and permissions.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.PERMISSION, PermissionActions.CREATE, {
    name: 'Create Permissions',
    description: 'Create new custom permissions.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.PERMISSION, PermissionActions.UPDATE, {
    name: 'Update Permissions',
    description: 'Modify existing permissions.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.PERMISSION, PermissionActions.DELETE, {
    name: 'Delete Permissions',
    description: 'Delete custom permissions.',
    displayOrder: 4,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.PERMISSION, PermissionActions.RESTORE, {
    name: 'Restore Permissions',
    description: 'Restore previously deleted permissions.',
    displayOrder: 5,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.PERMISSION, PermissionActions.EXPORT, {
    name: 'Export Permissions',
    description: 'Export permission definitions.',
    displayOrder: 6,
    isActive: true,
  }),

  // SYNC: definePermission(PermissionModules.PERMISSION, 'sync', {
  //   name: 'Synchronize Permissions',
  //   description: 'Synchronize seeded permissions with the database.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  // REVIEW: definePermission(PermissionModules.PERMISSION, 'review', {
  //   name: 'Review Permissions',
  //   description: 'Review newly introduced permissions before assigning them to roles.',
  //   displayOrder: 8,
  //   isActive: true,
  // }),

  MODULE_MANAGE: definePermission(PermissionModules.PERMISSION, PermissionActions.MANAGE, {
    name: 'Manage Permission Modules',
    description: 'Manage permission modules.',
    displayOrder: 9,
    isActive: true,
  }),

  // AUDIT: definePermission(PermissionModules.PERMISSION, 'audit', {
  //   name: 'View Permission Audit',
  //   description: 'View permission change history.',
  //   displayOrder: 10,
  //   isActive: true,
  // }),
} as const;
