import { ALL_PERMISSIONS } from './modules';

import type { PermissionDefinition } from './types';

export class DependencyValidator {
  private readonly permissionMap = new Map(
    ALL_PERMISSIONS.map((permission) => [permission.key, permission]),
  );

  /**
   * Validate every permission in registry.
   */
  validate(): void {
    for (const permission of ALL_PERMISSIONS) {
      this.validatePermission(permission);

      this.detectCircularDependency(permission.key);
    }
  }

  /**
   * Validate a single permission.
   */
  validatePermission(permission: PermissionDefinition): void {
    const deps = permission.dependencies;

    if (!deps) {
      return;
    }

    this.validateDependencyList(permission.key, deps.allOf);

    this.validateDependencyList(permission.key, deps.anyOf);

    this.validateDependencyList(permission.key, deps.conflictsWith);
  }

  /**
   * Validate dependency array.
   */
  private validateDependencyList(permissionKey: string, dependencies?: string[]): void {
    if (!dependencies) {
      return;
    }

    for (const dependency of dependencies) {
      if (!this.permissionMap.has(dependency)) {
        throw new Error(`"${permissionKey}" depends on unknown permission "${dependency}".`);
      }

      if (dependency === permissionKey) {
        throw new Error(`"${permissionKey}" cannot depend on itself.`);
      }
    }
  }

  /**
   * Detect circular dependencies using depth-first search.
   */
  private detectCircularDependency(startPermissionKey: string): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (key: string): void => {
      if (visiting.has(key)) {
        throw new Error(
          `Circular dependency detected involving "${key}". Path: ${[...path, key].join(' → ')}`,
        );
      }

      if (visited.has(key)) {
        return;
      }

      visiting.add(key);
      path.push(key);

      const permission = this.permissionMap.get(key);
      if (permission) {
        const deps = permission.dependencies;
        const dependenciesToVisit = [...(deps?.allOf ?? []), ...(deps?.anyOf ?? [])];

        for (const depKey of dependenciesToVisit) {
          dfs(depKey);
        }
      }

      path.pop();
      visiting.delete(key);
      visited.add(key);
    };

    dfs(startPermissionKey);
  }
}
