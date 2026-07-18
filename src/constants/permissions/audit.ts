import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const auditPermissionModule: PermissionModuleSeed = {
  name: 'Audit Logs',
  key: PermissionModules.AUDIT,
  displayOrder: 12,
  description: 'Audit Logs Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const AuditPermissions = {
  VIEW: definePermission(PermissionModules.AUDIT, PermissionActions.VIEW, {
    name: 'View Audit Logs',
    description: 'View application audit logs.',
    displayOrder: 1,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.AUDIT, PermissionActions.EXPORT, {
    name: 'Export Audit Logs',
    description: 'Export audit logs for compliance and reporting.',
    displayOrder: 2,
    isActive: true,
  }),

  // SEARCH: definePermission(PermissionModules.AUDIT, 'search', {
  //   name: 'Search Audit Logs',
  //   description: 'Search and filter audit logs.',
  //   displayOrder: 3,
  //   isActive: true,
  // }),

  // USER: definePermission(PermissionModules.AUDIT, 'view_user', {
  //   name: 'View User Activity',
  //   description: 'View audit history for specific users.',
  //   displayOrder: 4,
  //   isActive: true,
  // }),

  // ROLE: definePermission(PermissionModules.AUDIT, 'view_role', {
  //   name: 'View Role Changes',
  //   description: 'View role and permission change history.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // SYSTEM: definePermission(PermissionModules.AUDIT, 'view_system', {
  //   name: 'View System Events',
  //   description: 'View application startup, deployment and system events.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  // SECURITY: definePermission(PermissionModules.AUDIT, 'view_security', {
  //   name: 'View Security Events',
  //   description: 'View authentication, authorization and security-related events.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  // IMPERSONATION: definePermission(PermissionModules.AUDIT, 'view_impersonation', {
  //   name: 'View Impersonation Logs',
  //   description: 'View administrator impersonation history.',
  //   displayOrder: 8,
  //   isActive: true,
  // }),

  // LOGIN: definePermission(PermissionModules.AUDIT, 'view_login', {
  //   name: 'View Login History',
  //   description: 'View user login history and failed login attempts.',
  //   displayOrder: 9,
  //   isActive: true,
  // }),

  RETENTION_MANAGE: definePermission(PermissionModules.AUDIT, PermissionActions.MANAGE, {
    name: 'Manage Audit Retention',
    description: 'Configure audit log retention policies.',
    displayOrder: 10,
    isActive: true,
  }),
} as const;
