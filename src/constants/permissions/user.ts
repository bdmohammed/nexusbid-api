import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const userPermissionModule: PermissionModuleSeed = {
  name: 'User',
  key: PermissionModules.USER,
  displayOrder: 2,
  description: 'User Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const UserPermissions = {
  VIEW: definePermission(PermissionModules.USER, PermissionActions.VIEW, {
    name: 'View Users',
    description: 'View users and user profiles.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.USER, PermissionActions.CREATE, {
    name: 'Create Users',
    description: 'Create new user accounts.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.USER, PermissionActions.UPDATE, {
    name: 'Update Users',
    description: 'Edit user information.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.USER, PermissionActions.DELETE, {
    name: 'Delete Users',
    description: 'Soft delete user accounts.',
    displayOrder: 4,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.USER, PermissionActions.RESTORE, {
    name: 'Restore Users',
    description: 'Restore previously deleted user accounts.',
    displayOrder: 5,
    isActive: true,
  }),

  BLOCK: definePermission(PermissionModules.USER, PermissionActions.BLOCK, {
    name: 'Block Users',
    description: 'Block users from accessing the application.',
    displayOrder: 6,
    isActive: true,
  }),

  UNBLOCK: definePermission(PermissionModules.USER, PermissionActions.UNBLOCK, {
    name: 'Unblock Users',
    description: 'Unblock previously blocked users.',
    displayOrder: 7,
    isActive: true,
  }),

  ASSIGN_ROLE: definePermission(PermissionModules.USER, PermissionActions.ASSIGN, {
    name: 'Assign Roles',
    description: 'Assign one or more roles to admin users.',
    displayOrder: 8,
    isActive: true,
  }),

  REMOVE_ROLE: definePermission(PermissionModules.USER, PermissionActions.REMOVE, {
    name: 'Remove Roles',
    description: 'Remove assigned roles from admin users.',
    displayOrder: 9,
    isActive: true,
  }),

  // RESET_PASSWORD: definePermission(PermissionModules.USER, 'reset_password', {
  //   name: 'Reset Password',
  //   description: "Reset another user's password.",
  //   displayOrder: 10,
  //   isActive: true,
  // }),

  // IMPERSONATE: definePermission(PermissionModules.USER, 'impersonate', {
  //   name: 'Impersonate User',
  //   description: 'Temporarily access another user account for support purposes.',
  //   displayOrder: 11,
  //   isActive: true,
  //   customKey: 'user.impersonate',
  // }),

  EXPORT: definePermission(PermissionModules.USER, PermissionActions.EXPORT, {
    name: 'Export Users',
    description: 'Export user information.',
    displayOrder: 12,
    isActive: true,
  }),
} as const;
