// src/authorization/registry/modules/system.ts

import { ModuleDefinition } from "../types";

export const systemModule: ModuleDefinition = {
  slug: "system",

  name: "System",

  icon: "Settings",

  displayOrder: 13,

  isSystem: true,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "system.view",

      name: "View System",

      displayOrder: 1,

      action: "view",

      description:
        "View system configuration and status.",

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.settings.manage",

      name: "Manage Settings",

      displayOrder: 2,

      action: "manage",

      description:
        "Manage application settings.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.feature_flags.manage",

      name: "Manage Feature Flags",

      displayOrder: 3,

      action: "manage",

      description:
        "Enable or disable application features.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.maintenance.manage",

      name: "Maintenance Mode",

      displayOrder: 4,

      action: "manage",

      description:
        "Enable or disable maintenance mode.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.job.manage",

      name: "Manage Background Jobs",

      displayOrder: 5,

      action: "manage",

      description:
        "Run, stop and monitor scheduled jobs.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.cache.manage",

      name: "Manage Cache",

      displayOrder: 6,

      action: "manage",

      description:
        "Clear and rebuild application caches.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.backup.manage",

      name: "Manage Backups",

      displayOrder: 7,

      action: "manage",

      description:
        "Create and restore system backups.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.storage.manage",

      name: "Manage Storage",

      displayOrder: 8,

      action: "manage",

      description:
        "Manage uploaded files and storage configuration.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.email.manage",

      name: "Manage Email Configuration",

      displayOrder: 9,

      action: "manage",

      description:
        "Manage SMTP and email settings.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.payment.manage",

      name: "Manage Payment Gateways",

      displayOrder: 10,

      action: "manage",

      description:
        "Configure payment providers and credentials.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.api.manage",

      name: "Manage API Keys",

      displayOrder: 11,

      action: "manage",

      description:
        "Manage API keys and integrations.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.security.manage",

      name: "Manage Security",

      displayOrder: 12,

      action: "manage",

      description:
        "Manage security policies, password rules and authentication settings.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.initialize",

      name: "Initialize System",

      displayOrder: 13,

      action: "manage",

      description:
        "Run one-time system initialization.",

      dependencies: {
        allOf: ["system.view"],
      },

      hidden: true,

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.health.view",

      name: "View System Health",

      displayOrder: 14,

      action: "view",

      description:
        "View system health, queues and service status.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "system.version.view",

      name: "View System Version",

      displayOrder: 15,

      action: "view",

      description:
        "View deployed application version and build information.",

      dependencies: {
        allOf: ["system.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },
  ],
};