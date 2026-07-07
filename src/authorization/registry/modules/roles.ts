// src/authorization/registry/modules/roles.ts

import { ModuleDefinition } from "../types";

export const rolesModule: ModuleDefinition = {
  slug: "roles",

  name: "Roles",

  icon: "ShieldCheck",

  displayOrder: 3,

  isSystem: true,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "role.view",

      name: "View Roles",

      displayOrder: 1,

      action: "view",

      description:
        "View roles and their assigned permissions.",

      introducedIn: "1.0.0",
    },

    {
      key: "role.create",

      name: "Create Roles",

      displayOrder: 2,

      action: "create",

      description:
        "Create new custom roles.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.update",

      name: "Update Roles",

      displayOrder: 3,

      action: "update",

      description:
        "Modify existing roles.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.delete",

      name: "Delete Roles",

      displayOrder: 4,

      action: "delete",

      description:
        "Soft delete custom roles.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.restore",

      name: "Restore Roles",

      displayOrder: 5,

      action: "restore",

      description:
        "Restore deleted roles.",

      dependencies: {
        allOf: [
          "role.view",
          "role.delete",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.duplicate",

      name: "Duplicate Roles",

      displayOrder: 6,

      action: "create",

      description:
        "Create a copy of an existing role.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.activate",

      name: "Activate Roles",

      displayOrder: 7,

      action: "manage",

      description:
        "Activate inactive roles.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.deactivate",

      name: "Deactivate Roles",

      displayOrder: 8,

      action: "manage",

      description:
        "Deactivate active roles.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.assign_permissions",

      name: "Assign Permissions",

      displayOrder: 9,

      action: "manage",

      description:
        "Assign permissions to roles.",

      dependencies: {
        allOf: [
          "role.view",
          "permission.view",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.remove_permissions",

      name: "Remove Permissions",

      displayOrder: 10,

      action: "manage",

      description:
        "Remove permissions from roles.",

      dependencies: {
        allOf: [
          "role.view",
          "permission.view",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.export",

      name: "Export Roles",

      displayOrder: 11,

      action: "export",

      description:
        "Export role definitions.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "role.audit",

      name: "View Role Audit",

      displayOrder: 12,

      action: "view",

      description:
        "View role change history and audit logs.",

      dependencies: {
        allOf: ["role.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};