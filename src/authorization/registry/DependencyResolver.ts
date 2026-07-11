import { ALL_PERMISSIONS } from './modules';

import type { PermissionDefinition } from './types';

export interface ResolveOptions {
  /**
   * Automatically include dependencies.
   *
   * Default: true
   */
  includeDependencies?: boolean;

  /**
   * Throw if conflicting permissions exist.
   *
   * Default: true
   */
  validateConflicts?: boolean;
}

export interface DependencyResolution {
  /**
   * Final permission set.
   */
  permissions: Set<string>;

  /**
   * Auto-added dependencies.
   */
  added: Set<string>;

  /**
   * Missing permissions.
   */
  missing: Set<string>;

  /**
   * Conflicting permissions.
   */
  conflicts: Set<string>;
}

export class DependencyResolver {
  private readonly permissionMap = new Map(
    ALL_PERMISSIONS.map((permission) => [permission.key, permission]),
  );

  resolve(permissionKeys: string[], options: ResolveOptions = {}): DependencyResolution {
    const config = {
      includeDependencies: true,
      validateConflicts: true,
      ...options,
    };

    const resolution: DependencyResolution = {
      permissions: new Set(),
      added: new Set(),
      missing: new Set(),
      conflicts: new Set(),
    };

    for (const permissionKey of permissionKeys) {
      this.resolvePermission(permissionKey, resolution, new Set(), config);
    }

    return resolution;
  }

  private resolveAllOfDependencies(
    allOf: string[],
    resolution: DependencyResolution,
    visiting: Set<string>,
    options: Required<ResolveOptions>,
  ): void {
    for (const dependency of allOf) {
      if (!resolution.permissions.has(dependency)) {
        resolution.added.add(dependency);
      }

      this.resolvePermission(dependency, resolution, visiting, options);
    }
  }

  private validateConflicts(conflictsWith: string[], resolution: DependencyResolution): void {
    for (const conflict of conflictsWith) {
      if (resolution.permissions.has(conflict)) {
        resolution.conflicts.add(conflict);
      }
    }
  }

  private resolvePermission(
    permissionKey: string,
    resolution: DependencyResolution,
    visiting: Set<string>,
    options: Required<ResolveOptions>,
  ): void {
    if (resolution.permissions.has(permissionKey)) {
      return;
    }

    const permission = this.permissionMap.get(permissionKey);

    if (!permission) {
      resolution.missing.add(permissionKey);
      return;
    }

    if (visiting.has(permissionKey)) {
      throw new Error(`Circular dependency detected: ${permissionKey}`);
    }

    visiting.add(permissionKey);

    // ---------------------------------------
    // Resolve ALL OF
    // ---------------------------------------

    if (options.includeDependencies && permission.dependencies?.allOf) {
      this.resolveAllOfDependencies(permission.dependencies.allOf, resolution, visiting, options);
    }

    // ---------------------------------------
    // Validate CONFLICTS
    // ---------------------------------------

    if (options.validateConflicts && permission.dependencies?.conflictsWith) {
      this.validateConflicts(permission.dependencies.conflictsWith, resolution);
    }

    resolution.permissions.add(permissionKey);

    visiting.delete(permissionKey);
  }

  /**
   * Returns every dependency recursively.
   */
  getDependencies(permissionKey: string): string[] {
    return [...this.resolve([permissionKey]).added];
  }

  /**
   * Returns every permission that depends
   * on the supplied permission.
   */
  getDependents(permissionKey: string): PermissionDefinition[] {
    return ALL_PERMISSIONS.filter((permission) => {
      return permission.dependencies?.allOf?.includes(permissionKey) ?? false;
    });
  }

  /**
   * Returns true if permission exists.
   */
  exists(permissionKey: string): boolean {
    return this.permissionMap.has(permissionKey);
  }
}
