import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const notificationPermissionModule: PermissionModuleSeed = {
  name: 'Notification',
  key: PermissionModules.NOTIFICATION,
  displayOrder: 11,
  description: 'Notification Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const NotificationPermissions = {
  VIEW: definePermission(PermissionModules.NOTIFICATION, PermissionActions.VIEW, {
    name: 'View Notifications',
    description: 'View system notifications and notification history.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.CREATE, {
    name: 'Create Notification',
    description: 'Create new notifications.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.UPDATE, {
    name: 'Update Notification',
    description: 'Modify notification content.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.DELETE, {
    name: 'Delete Notification',
    description: 'Delete notifications.',
    displayOrder: 4,
    isActive: true,
  }),

  // SEND: definePermission(PermissionModules.NOTIFICATION, 'send', {
  //   name: 'Send Notification',
  //   description: 'Send notifications to users.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // SCHEDULE: definePermission(PermissionModules.NOTIFICATION, 'schedule', {
  //   name: 'Schedule Notification',
  //   description: 'Schedule notifications for future delivery.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  // CANCEL: definePermission(PermissionModules.NOTIFICATION, 'cancel', {
  //   name: 'Cancel Scheduled Notification',
  //   description: 'Cancel scheduled notifications.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  TEMPLATE_VIEW: definePermission(PermissionModules.NOTIFICATION, PermissionActions.VIEW, {
    name: 'View Templates',
    description: 'View notification templates.',
    displayOrder: 20,
    isActive: true,
  }),

  TEMPLATE_CREATE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.CREATE, {
    name: 'Create Templates',
    description: 'Create notification templates.',
    displayOrder: 21,
    isActive: true,
  }),

  TEMPLATE_UPDATE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.UPDATE, {
    name: 'Update Templates',
    description: 'Modify notification templates.',
    displayOrder: 22,
    isActive: true,
  }),

  TEMPLATE_DELETE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.DELETE, {
    name: 'Delete Templates',
    description: 'Delete notification templates.',
    displayOrder: 23,
    isActive: true,
  }),

  PREFERENCE_MANAGE: definePermission(PermissionModules.NOTIFICATION, PermissionActions.MANAGE, {
    name: 'Manage Notification Preferences',
    description: 'Manage email, SMS, push and in-app notification preferences.',
    displayOrder: 40,
    isActive: true,
  }),

  // AUDIT: definePermission(PermissionModules.NOTIFICATION, 'audit', {
  //   name: 'View Notification Audit',
  //   description: 'View notification delivery history and audit logs.',
  //   displayOrder: 50,
  //   isActive: true,
  // }),

  EXPORT: definePermission(PermissionModules.NOTIFICATION, PermissionActions.EXPORT, {
    name: 'Export Notifications',
    description: 'Export notification reports.',
    displayOrder: 51,
    isActive: true,
  }),
} as const;
