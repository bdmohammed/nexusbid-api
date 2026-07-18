import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const rolePermissionModule: PermissionModuleSeed = {
  name: 'Role',
  key: PermissionModules.ROLE,
  displayOrder: 3,
  description: 'Role Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const RolePermissions = {
  VIEW: definePermission(PermissionModules.ROLE, PermissionActions.VIEW, {
    name: 'View Roles',
    description: 'View roles, versions, and configurations.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.ROLE, PermissionActions.CREATE, {
    name: 'Create Roles',
    description: 'Create new role drafts and versions.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.ROLE, PermissionActions.UPDATE, {
    name: 'Update Roles',
    description: 'Modify role drafts and metadata.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.ROLE, PermissionActions.DELETE, {
    name: 'Delete Roles',
    description: 'Delete custom roles.',
    displayOrder: 4,
    isActive: true,
  }),

  REVIEW: definePermission(PermissionModules.ROLE, PermissionActions.REVIEW, {
    name: 'Review Roles',
    description: 'Access the role review queue.',
    displayOrder: 5,
    isActive: true,
  }),

  APPROVE: definePermission(PermissionModules.ROLE, PermissionActions.APPROVE, {
    name: 'Approve Roles',
    description: 'Approve pending role versions.',
    displayOrder: 6,
    isActive: true,
  }),

  REJECT: definePermission(PermissionModules.ROLE, PermissionActions.REJECT, {
    name: 'Reject Roles',
    description: 'Reject pending role versions.',
    displayOrder: 7,
    isActive: true,
  }),

  ASSIGN: definePermission(PermissionModules.ROLE, PermissionActions.ASSIGN, {
    name: 'Assign Roles',
    description: 'Assign or revoke roles from users.',
    displayOrder: 8,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.ROLE, PermissionActions.EXPORT, {
    name: 'Export Roles',
    description: 'Export roles and permissions.',
    displayOrder: 9,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.ROLE, PermissionActions.RESTORE, {
    name: 'Restore Roles',
    description: 'Restore archived roles.',
    displayOrder: 10,
    isActive: true,
  }),

  ARCHIVE: definePermission(PermissionModules.ROLE, PermissionActions.ARCHIVE, {
    name: 'Archive Roles',
    description: 'Soft-delete roles by archiving them.',
    displayOrder: 11,
    isActive: true,
  }),

  COMPARE: definePermission(PermissionModules.ROLE, PermissionActions.COMPARE, {
    name: 'Compare Roles',
    description: 'Compare different versions of a role.',
    displayOrder: 12,
    isActive: true,
  }),

  AUDIT_VIEW: definePermission(PermissionModules.ROLE, PermissionActions.AUDIT_VIEW, {
    name: 'View Audit Logs',
    description: 'View RBAC security audit logs.',
    displayOrder: 13,
    isActive: true,
  }),
} as const;
