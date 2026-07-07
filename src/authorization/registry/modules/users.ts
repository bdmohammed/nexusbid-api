// src/authorization/registry/modules/users.ts

import { ModuleDefinition } from "../types";

export const usersModule: ModuleDefinition = {
  slug: "users",

  name: "Users",

  icon: "Users",

  displayOrder: 2,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "user.view",

      name: "View Users",

      displayOrder: 1,

      action: "view",

      description: "View users and user profiles.",

      introducedIn: "1.0.0",
    },

    {
      key: "user.create",

      name: "Create Users",

      displayOrder: 2,

      action: "create",

      description: "Create new user accounts.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.update",

      name: "Update Users",

      displayOrder: 3,

      action: "update",

      description: "Edit user information.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.delete",

      name: "Delete Users",

      displayOrder: 4,

      action: "delete",

      description: "Soft delete user accounts.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.restore",

      name: "Restore Users",

      displayOrder: 5,

      action: "restore",

      description: "Restore previously deleted users.",

      dependencies: {
        allOf: [
          "user.view",
          "user.delete",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.block",

      name: "Block Users",

      displayOrder: 6,

      action: "custom",

      description: "Block user accounts from logging in.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.unblock",

      name: "Unblock Users",

      displayOrder: 7,

      action: "custom",

      description: "Unblock previously blocked users.",

      dependencies: {
        allOf: [
          "user.view",
          "user.block",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.assign_role",

      name: "Assign Roles",

      displayOrder: 8,

      action: "manage",

      description: "Assign one or more admin roles to users.",

      dependencies: {
        allOf: [
          "user.view",
          "role.view",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.remove_role",

      name: "Remove Roles",

      displayOrder: 9,

      action: "manage",

      description: "Remove assigned roles from users.",

      dependencies: {
        allOf: [
          "user.view",
          "role.view",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.reset_password",

      name: "Reset Password",

      displayOrder: 10,

      action: "manage",

      description: "Force reset another user's password.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.impersonate",

      name: "Impersonate User",

      displayOrder: 11,

      action: "manage",

      description: "Temporarily log in as another user for support purposes.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "user.export",

      name: "Export Users",

      displayOrder: 12,

      action: "export",

      description: "Export user information.",

      dependencies: {
        allOf: ["user.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};