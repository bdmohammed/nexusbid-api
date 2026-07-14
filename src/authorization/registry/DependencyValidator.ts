// src/authorization/registry/DependencyValidator.ts

import { ALL_PERMISSIONS } from "./modules";
import type { PermissionDefinition } from "./types";

export class DependencyValidator {
    private readonly permissionMap = new Map(
        ALL_PERMISSIONS.map(permission => [
            permission.key,
            permission,
        ]),
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
    validatePermission(
        permission: PermissionDefinition,
    ): void {
        const deps = permission.dependencies;

        if (!deps) {
            return;
        }

        this.validateDependencyList(
            permission.key,
            deps.allOf,
        );

        this.validateDependencyList(
            permission.key,
            deps.anyOf,
        );

        this.validateDependencyList(
            permission.key,
            deps.conflictsWith,
        );
    }

    /**
     * Validate dependency array.
     */
    private validateDependencyList(
        permissionKey: string,
        dependencies?: string[],
    ): void {
        if (!dependencies) {
            return;
        }

        for (const dependency of dependencies) {
            if (!this.permissionMap.has(dependency)) {
                throw new Error(
                    `"${permissionKey}" depends on unknown permission "${dependency}".`,
                );
            }

            if (dependency === permissionKey) {
                throw new Error(
                    `"${permissionKey}" cannot depend on itself.`,
                );
            }
        }
    }

    /**
   * Detect circular dependencies using depth-first search.
   */
    private detectCircularDependency(
        startPermissionKey: string,
    ): void {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const stack: { key: string; permission: PermissionDefinition; level: number }[] = [
            {
                key: startPermissionKey,
                permission: this.permissionMap.get(startPermissionKey)!,
                level: 0,
            },
        ];

        while (stack.length > 0) {
            const current = stack.pop()!;
            const { key, permission, level } = current;

            if (visiting.has(key)) {
                // Found a cycle!
                throw new Error(
                    `Circular dependency detected involving "${key}". Path: ${this.buildCyclePath(stack, key)}`,
                );
            }

            if (visited.has(key)) {
                continue;
            }

            visiting.add(key);

            const deps = permission.dependencies;
            const dependenciesToVisit: string[] = [];

            if (deps?.allOf) {
                dependenciesToVisit.push(...deps.allOf);
            }

            if (deps?.anyOf) {
                dependenciesToVisit.push(...deps.anyOf);
            }

            if (deps?.conflictsWith) {
                // Conflicts don't create dependency paths, just check for direct loops
                // We already check `key === dependency` above, so we're safe here
            }

            for (const depKey of dependenciesToVisit) {
                const depPermission = this.permissionMap.get(depKey);
                if (!depPermission) {
                    continue;
                }

                stack.push({
                    key: depKey,
                    permission: depPermission,
                    level: level + 1,
                });
            }

            visiting.delete(key);
            visited.add(key);
        }
    }

    /**
     * Build the path of the cycle for better error messages.
     */
    private buildCyclePath(
        stack: { key: string; permission: PermissionDefinition; level: number }[],
        targetKey: string,
    ): string {
        const path = stack
            .slice()
            .reverse()
            .filter(item => item.key === targetKey || stack.some(s => s.key === item.key))
            .map(item => item.key);

        return [...path, targetKey].join(' → ');
    }
}