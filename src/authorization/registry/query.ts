import { ALL_PERMISSIONS, MODULE_MAP, MODULES, PERMISSION_MAP } from './modules';

import type { ModuleDefinition, PermissionDefinition } from './types';

/**
 * Returns all modules.
 */
export function getModules(): ModuleDefinition[] {
  return MODULES;
}

/**
 * Returns all permissions.
 */
export function getPermissions(): PermissionDefinition[] {
  return ALL_PERMISSIONS;
}

/**
 * Returns a module by slug.
 */
export function getModule(slug: string): ModuleDefinition | undefined {
  return MODULE_MAP.get(slug);
}

/**
 * Returns a permission by key.
 */
export function getPermission(key: string): PermissionDefinition | undefined {
  return PERMISSION_MAP.get(key);
}

/**
 * Returns true if a module exists.
 */
export function moduleExists(slug: string): boolean {
  return MODULE_MAP.has(slug);
}

/**
 * Returns true if permission exists.
 */
export function permissionExists(key: string): boolean {
  return PERMISSION_MAP.has(key);
}

/**
 * Returns all permissions for a module.
 */
export function getPermissionsByModule(moduleSlug: string): PermissionDefinition[] {
  return MODULE_MAP.get(moduleSlug)?.permissions ?? [];
}

/**
 * Returns all system modules.
 */
export function getSystemModules() {
  return MODULES.filter((module) => module.isSystem);
}

/**
 * Returns all system permissions.
 */
export function getSystemPermissions() {
  return ALL_PERMISSIONS.filter((permission) => permission.isSystem);
}

/**
 * Returns all permissions using an action.
 */
export function getPermissionsByAction(action: PermissionDefinition['action']) {
  return ALL_PERMISSIONS.filter((permission) => permission.action === action);
}

/**
 * Returns permissions introduced in a version.
 */
export function getPermissionsByVersion(version: string) {
  return ALL_PERMISSIONS.filter((permission) => permission.introducedIn === version);
}

/**
 * Returns deprecated permissions.
 */
export function getDeprecatedPermissions() {
  return ALL_PERMISSIONS.filter((permission) => permission.deprecatedIn);
}

/**
 * Returns hidden permissions.
 */
export function getHiddenPermissions() {
  return ALL_PERMISSIONS.filter((permission) => permission.hidden);
}

/**
 * Returns permissions that depend on a permission.
 *
 * Example:
 *
 * user.view
 *
 * ↓
 *
 * user.create
 * user.update
 * user.delete
 */
export function getDependents(permissionKey: string): PermissionDefinition[] {
  return ALL_PERMISSIONS.filter((permission) => {
    const deps = permission.dependencies;

    if (!deps) {
      return false;
    }

    return (
      deps.allOf?.includes(permissionKey) ??
      deps.anyOf?.includes(permissionKey) ??
      deps.conflictsWith?.includes(permissionKey)
    );
  });
}

/**
 * Returns direct dependencies.
 */
export function getDependencies(permissionKey: string): string[] {
  const permission = PERMISSION_MAP.get(permissionKey);

  if (!permission?.dependencies) {
    return [];
  }

  return [...(permission.dependencies.allOf ?? []), ...(permission.dependencies.anyOf ?? [])];
}

/**
 * Search permissions.
 */
export function searchPermissions(keyword: string): PermissionDefinition[] {
  const search = keyword.toLowerCase();

  return ALL_PERMISSIONS.filter(
    (permission) =>
      permission.key.toLowerCase().includes(search) ||
      permission.name.toLowerCase().includes(search) ||
      permission.description.toLowerCase().includes(search),
  );
}

/**
 * Search modules.
 */
export function searchModules(keyword: string): ModuleDefinition[] {
  const search = keyword.toLowerCase();

  return MODULES.filter(
    (module) =>
      module.name.toLowerCase().includes(search) || module.slug.toLowerCase().includes(search),
  );
}

/**
 * Returns registry statistics.
 */
export function getRegistryStats() {
  return {
    modules: MODULES.length,

    permissions: ALL_PERMISSIONS.length,

    systemModules: getSystemModules().length,

    systemPermissions: getSystemPermissions().length,

    deprecatedPermissions: getDeprecatedPermissions().length,

    hiddenPermissions: getHiddenPermissions().length,
  };
}
