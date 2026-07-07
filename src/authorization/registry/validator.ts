// src/authorization/registry/validator.ts

import { MODULES } from "./modules";
import {
  ModuleDefinition,
  PermissionDefinition,
} from "./types";
export class RegistryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryValidationError";
    Object.setPrototypeOf(this, RegistryValidationError.prototype);
  }
}

import { logger } from "../../config/logger";

const PERMISSION_KEY_REGEX =
  /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function ensure(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new RegistryValidationError(message);
  }
}

export function validateRegistry(): void {
  validateModules();

  validatePermissions();

  validateDependencies();

  validateDisplayOrders();
}

function validateModules() {
  const slugSet = new Set<string>();

  for (const module of MODULES) {
    ensure(
      module.slug.trim().length > 0,
      "Module slug cannot be empty.",
    );

    ensure(
      !slugSet.has(module.slug),
      `Duplicate module slug "${module.slug}".`,
    );

    slugSet.add(module.slug);

    ensure(
      module.permissions.length > 0,
      `Module "${module.slug}" has no permissions.`,
    );
  }
}

function validatePermissions() {
  const permissionSet = new Set<string>();

  for (const module of MODULES) {
    for (const permission of module.permissions) {
      validatePermission(module, permission, permissionSet);
    }
  }
}

function validatePermission(
  module: ModuleDefinition,
  permission: PermissionDefinition,
  permissionSet: Set<string>,
) {
  ensure(
    permission.key.trim().length > 0,
    `Permission key cannot be empty (${module.slug}).`,
  );

  ensure(
    PERMISSION_KEY_REGEX.test(permission.key),
    `Invalid permission key "${permission.key}".`,
  );

  ensure(
    !permissionSet.has(permission.key),
    `Duplicate permission "${permission.key}".`,
  );

  permissionSet.add(permission.key);

  ensure(
    permission.name.trim().length > 0,
    `Permission "${permission.key}" has no name.`,
  );

  ensure(
    permission.description.trim().length > 0,
    `Permission "${permission.key}" has no description.`,
  );
}

function validateDependencies() {
  const permissionKeys = new Set<string>();

  for (const module of MODULES) {
    for (const permission of module.permissions) {
      permissionKeys.add(permission.key);
    }
  }

  for (const module of MODULES) {
    for (const permission of module.permissions) {
      const deps = permission.dependencies;

      if (!deps) continue;

      validateDependencyArray(
        permission.key,
        deps.allOf,
        permissionKeys,
      );

      validateDependencyArray(
        permission.key,
        deps.anyOf,
        permissionKeys,
      );

      validateDependencyArray(
        permission.key,
        deps.conflictsWith,
        permissionKeys,
      );
    }
  }
}

function validateDependencyArray(
  permissionKey: string,
  dependencies: string[] | undefined,
  registry: Set<string>,
) {
  if (!dependencies) return;

  for (const dependency of dependencies) {
    ensure(
      registry.has(dependency),
      `Permission "${permissionKey}" depends on unknown permission "${dependency}".`,
    );

    ensure(
      dependency !== permissionKey,
      `Permission "${permissionKey}" cannot depend on itself.`,
    );
  }
}

function validateDisplayOrders() {
  const moduleOrders = new Set<number>();

  for (const module of MODULES) {
    ensure(
      !moduleOrders.has(module.displayOrder),
      `Duplicate module displayOrder ${module.displayOrder}.`,
    );

    moduleOrders.add(module.displayOrder);

    const permissionOrders = new Set<number>();

    for (const permission of module.permissions) {
      ensure(
        !permissionOrders.has(permission.displayOrder),
        `Duplicate permission displayOrder ${permission.displayOrder} inside module "${module.slug}".`,
      );

      permissionOrders.add(permission.displayOrder);
    }
  }
}

/**
 * Call once during application bootstrap.
 */
export function validatePermissionRegistry() {
  validateRegistry();

  logger.info(
    { modulesCount: MODULES.length },
    'Permission Registry validated successfully',
  );
}