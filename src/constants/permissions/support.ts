import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const supportPermissionModule: PermissionModuleSeed = {
  name: 'Support',
  key: PermissionModules.SUPPORT,
  displayOrder: 8,
  description: 'Support Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const SupportPermissions = {
  VIEW: definePermission(PermissionModules.SUPPORT, PermissionActions.VIEW, {
    name: 'View Tickets',
    description: 'View customer support tickets.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.SUPPORT, PermissionActions.CREATE, {
    name: 'Create Tickets',
    description: 'Create support tickets on behalf of customers.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.SUPPORT, PermissionActions.UPDATE, {
    name: 'Update Tickets',
    description: 'Update support ticket information.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.SUPPORT, PermissionActions.DELETE, {
    name: 'Delete Tickets',
    description: 'Delete support tickets.',
    displayOrder: 4,
    isActive: true,
  }),

  // ASSIGN: definePermission(PermissionModules.SUPPORT, 'assign', {
  //   name: 'Assign Tickets',
  //   description: 'Assign tickets to support agents.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // REPLY: definePermission(PermissionModules.SUPPORT, 'reply', {
  //   name: 'Reply to Tickets',
  //   description: 'Reply to customer support tickets.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  // CLOSE: definePermission(PermissionModules.SUPPORT, 'close', {
  //   name: 'Close Tickets',
  //   description: 'Close resolved support tickets.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  // REOPEN: definePermission(PermissionModules.SUPPORT, 'reopen', {
  //   name: 'Reopen Tickets',
  //   description: 'Reopen previously closed tickets.',
  //   displayOrder: 8,
  //   isActive: true,
  // }),

  EXPORT: definePermission(PermissionModules.SUPPORT, PermissionActions.EXPORT, {
    name: 'Export Tickets',
    description: 'Export support ticket reports.',
    displayOrder: 9,
    isActive: true,
  }),

  // AUDIT: definePermission(PermissionModules.SUPPORT, 'audit', {
  //   name: 'View Ticket Audit',
  //   description: 'View support ticket activity history.',
  //   displayOrder: 10,
  //   isActive: true,
  // }),
} as const;
