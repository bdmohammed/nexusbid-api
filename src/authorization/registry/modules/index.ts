import { analyticsModule } from './analytics';
import { auditModule } from './audit';
import { billingModule } from './billing';
import { cmsModule } from './cms';
import { dashboardModule } from './dashboard';
import { notificationsModule } from './notifications';
import { permissionManagementModule } from './permission-management';
import { rolesModule } from './roles';
import { supportModule } from './support';
import { systemModule } from './system';
import { taxonomyModule } from './taxonomy';
import { tendersModule } from './tenders';
import { usersModule } from './users';

import type { ModuleDefinition } from '../types';

/**
 * Master list of all registry modules.
 *
 * IMPORTANT:
 * - Order determines the Admin UI navigation.
 * - displayOrder is validated at startup.
 * - Every module must be unique.
 */
export const MODULES: ModuleDefinition[] = [
  dashboardModule,
  usersModule,
  rolesModule,
  permissionManagementModule,
  tendersModule,
  taxonomyModule,
  billingModule,
  supportModule,
  analyticsModule,
  cmsModule,
  notificationsModule,
  auditModule,
  systemModule,
];

/**
 * Quick lookup by slug.
 */
export const MODULE_MAP = new Map(MODULES.map((module) => [module.slug, module]));

/**
 * Flat permission list.
 */
export const ALL_PERMISSIONS = MODULES.flatMap((module) => module.permissions);

/**
 * Permission lookup by key.
 */
export const PERMISSION_MAP = new Map(
  ALL_PERMISSIONS.map((permission) => [permission.key, permission]),
);

/**
 * List of all permission keys.
 */
export const PERMISSION_KEYS = ALL_PERMISSIONS.map((permission) => permission.key);

/**
 * List of system modules.
 */
export const SYSTEM_MODULES = MODULES.filter((module) => module.isSystem);

/**
 * List of system permissions.
 */
export const SYSTEM_PERMISSIONS = ALL_PERMISSIONS.filter((permission) => permission.isSystem);
