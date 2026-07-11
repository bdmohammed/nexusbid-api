import type { ModuleDefinition } from '../types';

export const notificationsModule: ModuleDefinition = {
  slug: 'notifications',
  name: 'Notifications',
  icon: 'Bell',
  displayOrder: 11,
  introducedIn: '1.0.0',
  permissions: [
    {
      key: 'notification.view',
      name: 'View Notifications',
      displayOrder: 1,
      action: 'view',
      description: 'View system notifications and notification history.',
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.create',
      name: 'Create Notification',
      displayOrder: 2,
      action: 'create',
      description: 'Create new notifications.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.update',
      name: 'Update Notification',
      displayOrder: 3,
      action: 'update',
      description: 'Modify notification content before sending.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.delete',
      name: 'Delete Notification',
      displayOrder: 4,
      action: 'delete',
      description: 'Delete notifications.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.send',
      name: 'Send Notification',
      displayOrder: 5,
      action: 'manage',
      description: 'Send notifications to users.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.schedule',
      name: 'Schedule Notification',
      displayOrder: 6,
      action: 'manage',
      description: 'Schedule notifications for future delivery.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.cancel',
      name: 'Cancel Scheduled Notification',
      displayOrder: 7,
      action: 'manage',
      description: 'Cancel scheduled notifications.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.template.view',
      name: 'View Templates',
      displayOrder: 20,
      action: 'view',
      description: 'View notification templates.',
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.template.create',
      name: 'Create Templates',
      displayOrder: 21,
      action: 'create',
      description: 'Create notification templates.',
      dependencies: {
        allOf: ['notification.template.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.template.update',
      name: 'Update Templates',
      displayOrder: 22,
      action: 'update',
      description: 'Modify notification templates.',
      dependencies: {
        allOf: ['notification.template.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.template.delete',
      name: 'Delete Templates',
      displayOrder: 23,
      action: 'delete',
      description: 'Delete notification templates.',
      dependencies: {
        allOf: ['notification.template.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.preference.manage',
      name: 'Manage Notification Preferences',
      displayOrder: 40,
      action: 'manage',
      description: 'Manage email, SMS, push and in-app notification preferences.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.audit',
      name: 'View Notification Audit',
      displayOrder: 50,
      action: 'view',
      description: 'View notification delivery history and audit logs.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'notification.export',
      name: 'Export Notifications',
      displayOrder: 51,
      action: 'export',
      description: 'Export notification reports.',
      dependencies: {
        allOf: ['notification.view'],
      },
      introducedIn: '1.0.0',
    },
  ],
};
