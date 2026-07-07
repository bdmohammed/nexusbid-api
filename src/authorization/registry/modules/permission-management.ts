// src/authorization/registry/modules/permission-management.ts

import { ModuleDefinition } from "../types";

export const permissionManagementModule: ModuleDefinition = {
  slug: "permissions",

  name: "Permissions",

  icon: "KeyRound",

  displayOrder: 4,

  isSystem: true,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "permission.view",

      name: "View Permissions",

      displayOrder: 1,

      action: "view",

      description:
        "View all permission modules and permissions.",

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "permission.create",

      name: "Create Permissions",

      displayOrder: 2,

      action: "create",

      description:
        "Create new custom permissions.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.update",

      name: "Update Permissions",

      displayOrder: 3,

      action: "update",

      description:
        "Modify existing permissions.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.delete",

      name: "Delete Permissions",

      displayOrder: 4,

      action: "delete",

      description:
        "Delete custom permissions.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.restore",

      name: "Restore Permissions",

      displayOrder: 5,

      action: "restore",

      description:
        "Restore deleted permissions.",

      isSystem: true,

      dependencies: {
        allOf: [
          "permission.view",
          "permission.delete",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.export",

      name: "Export Permissions",

      displayOrder: 6,

      action: "export",

      description:
        "Export permission definitions.",

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.sync",

      name: "Synchronize Permission Registry",

      displayOrder: 7,

      action: "manage",

      description:
        "Synchronize registry definitions with the database.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.review",

      name: "Review New Permissions",

      displayOrder: 8,

      action: "manage",

      description:
        "Review newly introduced permissions before assigning them to business roles.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.module.manage",

      name: "Manage Permission Modules",

      displayOrder: 9,

      action: "manage",

      description:
        "Create, update and organize permission modules.",

      isSystem: true,

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "permission.audit",

      name: "View Permission Audit",

      displayOrder: 10,

      action: "view",

      description:
        "View permission change history.",

      dependencies: {
        allOf: ["permission.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};