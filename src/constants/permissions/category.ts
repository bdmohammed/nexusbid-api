import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const categoryPermissionModule: PermissionModuleSeed = {
  name: 'Categories',
  key: PermissionModules.CATEGORY,
  displayOrder: 6,
  description: 'Categories Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const CategoryPermissions = {
  VIEW: definePermission(PermissionModules.CATEGORY, PermissionActions.VIEW, {
    name: 'View Categories',
    description: 'View category hierarchy.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.CATEGORY, PermissionActions.CREATE, {
    name: 'Create Categories',
    description: 'Create new categories.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.CATEGORY, PermissionActions.UPDATE, {
    name: 'Update Categories',
    description: 'Update existing categories.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.CATEGORY, PermissionActions.DELETE, {
    name: 'Delete Categories',
    description: 'Delete categories.',
    displayOrder: 4,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.CATEGORY, PermissionActions.RESTORE, {
    name: 'Restore Categories',
    description: 'Restore deleted categories.',
    displayOrder: 5,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.CATEGORY, PermissionActions.EXPORT, {
    name: 'Export Categories',
    description: 'Export category data.',
    displayOrder: 6,
    isActive: true,
  }),
} as const;
