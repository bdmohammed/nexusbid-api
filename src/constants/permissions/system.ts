import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const systemPermissionModule: PermissionModuleSeed = {
  name: 'System',
  key: PermissionModules.SYSTEM,
  displayOrder: 13,
  description: 'System Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const SystemPermissions = {
  VIEW: definePermission(PermissionModules.SYSTEM, PermissionActions.VIEW, {
    name: 'View System',
    description: 'View system configuration and status.',
    displayOrder: 1,
    isActive: true,
  }),

  SETTINGS_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Settings',
    description: 'Manage application settings.',
    displayOrder: 2,
    isActive: true,
  }),

  FEATURE_FLAGS_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Feature Flags',
    description: 'Enable or disable application feature flags.',
    displayOrder: 3,
    isActive: true,
  }),

  MAINTENANCE_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Maintenance Mode',
    description: 'Enable or disable maintenance mode.',
    displayOrder: 4,
    isActive: true,
  }),

  JOB_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Background Jobs',
    description: 'Run, stop and monitor background jobs.',
    displayOrder: 5,
    isActive: true,
  }),

  CACHE_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Cache',
    description: 'Clear and rebuild application caches.',
    displayOrder: 6,
    isActive: true,
  }),

  BACKUP_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Backups',
    description: 'Create and restore application backups.',
    displayOrder: 7,
    isActive: true,
  }),

  STORAGE_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Storage',
    description: 'Manage uploaded files and storage configuration.',
    displayOrder: 8,
    isActive: true,
  }),

  EMAIL_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Email Configuration',
    description: 'Configure SMTP and email settings.',
    displayOrder: 9,
    isActive: true,
  }),

  PAYMENT_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Payment Gateways',
    description: 'Configure payment gateway providers and credentials.',
    displayOrder: 10,
    isActive: true,
  }),

  API_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage API Keys',
    description: 'Manage API keys and third-party integrations.',
    displayOrder: 11,
    isActive: true,
  }),

  SECURITY_MANAGE: definePermission(PermissionModules.SYSTEM, PermissionActions.MANAGE, {
    name: 'Manage Security',
    description: 'Manage security policies and authentication settings.',
    displayOrder: 12,
    isActive: true,
  }),

  // INITIALIZE: definePermission(PermissionModules.SYSTEM, 'initialize', {
  //   name: 'Initialize System',
  //   description: 'Run one-time application initialization.',
  //   displayOrder: 13,
  //   isActive: true,
  // }),

  HEALTH_VIEW: definePermission(PermissionModules.SYSTEM, PermissionActions.VIEW, {
    name: 'View System Health',
    description: 'View system health, queues and service status.',
    displayOrder: 14,
    isActive: true,
  }),

  VERSION_VIEW: definePermission(PermissionModules.SYSTEM, PermissionActions.VIEW, {
    name: 'View System Version',
    description: 'View deployed application version and build information.',
    displayOrder: 15,
    isActive: true,
  }),
} as const;
