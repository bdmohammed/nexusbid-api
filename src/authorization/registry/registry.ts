// src/authorization/registry/registry.ts

import type { RegistryDefinition } from "./types";
import {
  MODULES,
  ALL_PERMISSIONS,
  MODULE_MAP,
  PERMISSION_MAP,
  SYSTEM_MODULES,
  SYSTEM_PERMISSIONS,
} from "./modules";

/**
 * Registry Version
 *
 * Increment whenever:
 * - Module added
 * - Module removed
 * - Permission added
 * - Permission removed
 * - Permission renamed
 * - Dependency changed
 *
 * Used for:
 * - Permission synchronization
 * - Deployment validation
 * - Audit logs
 * - Permission review
 */
export const REGISTRY_VERSION = "1.0.0";

/**
 * Registry Metadata
 */
export const PERMISSION_REGISTRY: RegistryDefinition = {
  version: REGISTRY_VERSION,

  author: "NexusBid",

  modules: MODULES,
};

/**
 * Registry Statistics
 */
export const REGISTRY_STATS = {
  version: REGISTRY_VERSION,

  moduleCount: MODULES.length,

  permissionCount: ALL_PERMISSIONS.length,

  systemModuleCount: SYSTEM_MODULES.length,

  systemPermissionCount: SYSTEM_PERMISSIONS.length,
};

/**
 * Flattened permission list.
 */
export { ALL_PERMISSIONS };

/**
 * Module list.
 */
export { MODULES };

/**
 * System modules.
 */
export { SYSTEM_MODULES };

/**
 * System permissions.
 */
export { SYSTEM_PERMISSIONS };

/**
 * Fast lookup maps.
 */
export { MODULE_MAP };

export { PERMISSION_MAP };

/**
 * Find module.
 */
export function getModule(slug: string) {
  return MODULE_MAP.get(slug);
}

/**
 * Find permission.
 */
export function getPermission(key: string) {
  return PERMISSION_MAP.get(key);
}

/**
 * Returns true if permission exists.
 */
export function hasPermission(key: string): boolean {
  return PERMISSION_MAP.has(key);
}

/**
 * Returns all permissions for a module.
 */
export function getModulePermissions(moduleSlug: string) {
  const module = MODULE_MAP.get(moduleSlug);

  if (!module) {
    return [];
  }

  return module.permissions;
}

/**
 * Returns all permission keys.
 */
export function getPermissionKeys(): string[] {
  return ALL_PERMISSIONS.map(permission => permission.key);
}

/**
 * Returns only system permissions.
 */
export function getSystemPermissionKeys(): string[] {
  return SYSTEM_PERMISSIONS.map(permission => permission.key);
}

/**
 * Returns permissions introduced after a version.
 *
 * Useful for:
 * - Permission Review
 * - Upgrade Wizard
 * */
export function getPermissionsIntroducedIn(version: string) {
  return ALL_PERMISSIONS.filter(
    permission => permission.introducedIn === version,
  );
}