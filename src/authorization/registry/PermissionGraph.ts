// src/authorization/registry/PermissionGraph.ts

import { ALL_PERMISSIONS } from "./modules";
import { PermissionDefinition } from "./types";

export class PermissionGraph {
    private readonly permissionMap = new Map<
        string,
        PermissionDefinition
    >();

    private readonly adjacencyList = new Map<
        string,
        Set<string>
    >();

    private readonly reverseAdjacencyList = new Map<
        string,
        Set<string>
    >();

    constructor(
        permissions: PermissionDefinition[] = ALL_PERMISSIONS,
    ) {
        this.build(permissions);
    }

    /**
     * Build graph.
     */
    private build(
        permissions: PermissionDefinition[],
    ): void {
        for (const permission of permissions) {
            this.permissionMap.set(
                permission.key,
                permission,
            );

            this.adjacencyList.set(
                permission.key,
                new Set(),
            );

            this.reverseAdjacencyList.set(
                permission.key,
                new Set(),
            );
        }

        for (const permission of permissions) {
            const deps = permission.dependencies;

            if (!deps) {
                continue;
            }

            const edges = [
                ...(deps.allOf ?? []),
                ...(deps.anyOf ?? []),
            ];

            for (const dependency of edges) {
                this.adjacencyList
                    .get(permission.key)!
                    .add(dependency);

                this.reverseAdjacencyList
                    .get(dependency)
                    ?.add(permission.key);
            }
        }
    }

    /**
     * Returns permission.
     */
    getPermission(
        key: string,
    ): PermissionDefinition | undefined {
        return this.permissionMap.get(key);
    }

    /**
     * Returns true if permission exists.
     */
    hasPermission(
        key: string,
    ): boolean {
        return this.permissionMap.has(key);
    }

    /**
     * Direct dependencies.
     */
    getDependencies(
        key: string,
    ): string[] {
        return [
            ...(this.adjacencyList.get(key) ?? []),
        ];
    }

    /**
     * Direct dependents.
     */
    getDependents(
        key: string,
    ): string[] {
        return [
            ...(this.reverseAdjacencyList.get(key) ?? []),
        ];
    }

    /**
     * Returns every permission.
     */
    getPermissions(): PermissionDefinition[] {
        return [
            ...this.permissionMap.values(),
        ];
    }

    /**
     * Returns every permission key.
     */
    getPermissionKeys(): string[] {
        return [
            ...this.permissionMap.keys(),
        ];
    }

    /**
     * Returns graph size.
     */
    size(): number {
        return this.permissionMap.size;
    }

    /**
     * DFS traversal.
     */
    traverse(
        permissionKey: string,
        callback: (permission: PermissionDefinition) => void,
    ): void {
        const visited = new Set<string>();

        const dfs = (key: string) => {
            if (visited.has(key)) {
                return;
            }

            visited.add(key);

            const permission =
                this.permissionMap.get(key);

            if (!permission) {
                return;
            }

            callback(permission);

            for (const dependency of this.getDependencies(
                key,
            )) {
                dfs(dependency);
            }
        };

        dfs(permissionKey);
    }

    /**
     * Returns every dependency recursively.
     */
    getRecursiveDependencies(
        permissionKey: string,
    ): string[] {
        const dependencies = new Set<string>();

        this.traverse(
            permissionKey,
            permission => {
                if (permission.key !== permissionKey) {
                    dependencies.add(permission.key);
                }
            },
        );

        return [...dependencies];
    }

    /**
     * Detect circular dependency.
     */
    hasCycle(): boolean {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const dfs = (
            permissionKey: string,
        ): boolean => {
            if (visiting.has(permissionKey)) {
                return true;
            }

            if (visited.has(permissionKey)) {
                return false;
            }

            visiting.add(permissionKey);

            for (const dependency of this.getDependencies(
                permissionKey,
            )) {
                if (dfs(dependency)) {
                    return true;
                }
            }

            visiting.delete(permissionKey);
            visited.add(permissionKey);

            return false;
        };

        for (const key of this.permissionMap.keys()) {
            if (dfs(key)) {
                return true;
            }
        }

        return false;
    }
}