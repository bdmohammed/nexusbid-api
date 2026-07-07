// src/authorization/registry/types.ts
//
// Canonical types are defined here.

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "publish"
  | "archive"
  | "restore"
  | "export"
  | "import"
  | "manage"
  | "custom";

export interface PermissionDependency {
  /**
   * All of these permissions are required.
   */
  allOf?: string[];

  /**
   * At least one of these permissions is required.
   */
  anyOf?: string[];

  /**
   * These permissions cannot exist together.
   */
  conflictsWith?: string[];
}

export interface PermissionDefinition {
  /**
   * Globally unique permission key.
   * Example:
   * user.view
   * tender.create
   */
  key: string;

  /**
   * Human readable name.
   */
  name: string;

  /**
   * Used by UI ordering.
   */
  displayOrder: number;

  /**
   * Permission action.
   */
  action: PermissionAction;

  /**
   * Description shown in Admin UI.
   */
  description: string;

  /**
   * Internal/system permission.
   * Cannot be deleted.
   */
  isSystem?: boolean;

  /**
   * Hide from normal permission matrix.
   */
  hidden?: boolean;

  /**
   * Feature flag.
   */
  featureFlag?: string;

  /**
   * Registry version introducing this permission.
   */
  introducedIn?: string;

  /**
   * Deprecation version.
   */
  deprecatedIn?: string;

  /**
   * Replacement permission.
   */
  replacedBy?: string;

  /**
   * Permission dependency rules.
   */
  dependencies?: PermissionDependency;
}

export interface ModuleDefinition {
  /**
   * Unique module slug.
   */
  slug: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * Icon name (frontend).
   */
  icon?: string;

  /**
   * Ordering.
   */
  displayOrder: number;

  /**
   * Cannot be deleted by admin.
   */
  isSystem?: boolean;

  /**
   * Registry version.
   */
  introducedIn?: string;

  /**
   * Registry version.
   */
  deprecatedIn?: string;

  /**
   * Permissions belonging to this module.
   */
  permissions: PermissionDefinition[];
}

export interface RegistryDefinition {
  /**
   * Registry version.
   * Changes whenever permissions/modules change.
   */
  version: string;

  /**
   * Registry author.
   */
  author?: string;

  /**
   * Registry modules.
   */
  modules: ModuleDefinition[];
}