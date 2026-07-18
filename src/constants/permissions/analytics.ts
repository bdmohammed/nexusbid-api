import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const analyticsPermissionModule: PermissionModuleSeed = {
  name: 'Analytics',
  key: PermissionModules.ANALYTICS,
  displayOrder: 9,
  description: 'Analytics Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const AnalyticsPermissions = {
  VIEW: definePermission(PermissionModules.ANALYTICS, PermissionActions.VIEW, {
    name: 'View BI Overview',
    description: 'View dashboard overview, general tenders and categories distribution.',
    displayOrder: 1,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.ANALYTICS, PermissionActions.EXPORT, {
    name: 'Export BI Data',
    description: 'Initiate asynchronous data exports for reports.',
    displayOrder: 2,
    isActive: true,
  }),

  // FINANCIAL: definePermission(PermissionModules.ANALYTICS, 'view_financial', {
  //   name: 'View Financial Analytics',
  //   description: 'Access billing summaries, ARR/MRR trends, and revenue collections.',
  //   displayOrder: 3,
  //   isActive: true,
  // }),

  // USERS: definePermission(PermissionModules.ANALYTICS, 'view_users', {
  //   name: 'View User Analytics',
  //   description: 'View customer registrations, active account types, and user sessions.',
  //   displayOrder: 4,
  //   isActive: true,
  // }),

  // VENDORS: definePermission(PermissionModules.ANALYTICS, 'view_vendors', {
  //   name: 'View Vendor Analytics',
  //   description: 'Access vendor performance charts, bid win ratios, and leaderboards.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // SYSTEM: definePermission(PermissionModules.ANALYTICS, 'view_system', {
  //   name: 'View System Analytics',
  //   description: 'View server latency, queue depth, cache hits, and background execution logs.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  // REPORTS: definePermission(PermissionModules.ANALYTICS, 'manage_reports', {
  //   name: 'Manage Scheduled Reports',
  //   description: 'Configure and automate report emails to roles or webhooks.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  // AI: definePermission(PermissionModules.ANALYTICS, 'access_ai', {
  //   name: 'Access AI Insights',
  //   description: 'Receive predictions, churn forecasting, and procurement demand suggestions.',
  //   displayOrder: 8,
  //   isActive: true,
  // }),
} as const;
