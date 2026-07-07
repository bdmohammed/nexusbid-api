// src/authorization/registry/modules/audit.ts

import { ModuleDefinition } from "../types";

export const auditModule: ModuleDefinition = {
  slug: "audit",

  name: "Audit Logs",

  icon: "History",

  displayOrder: 12,

  isSystem: true,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "audit.view",

      name: "View Audit Logs",

      displayOrder: 1,

      action: "view",

      description:
        "View application audit logs.",

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.export",

      name: "Export Audit Logs",

      displayOrder: 2,

      action: "export",

      description:
        "Export audit logs for compliance and reporting.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.search",

      name: "Search Audit Logs",

      displayOrder: 3,

      action: "view",

      description:
        "Search and filter audit logs.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.user",

      name: "View User Activity",

      displayOrder: 4,

      action: "view",

      description:
        "View audit history for specific users.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.role",

      name: "View Role Changes",

      displayOrder: 5,

      action: "view",

      description:
        "View role and permission change history.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.system",

      name: "View System Events",

      displayOrder: 6,

      action: "view",

      description:
        "View application startup, deployment and system events.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.security",

      name: "View Security Events",

      displayOrder: 7,

      action: "view",

      description:
        "View authentication, authorization and security-related events.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.impersonation",

      name: "View Impersonation Logs",

      displayOrder: 8,

      action: "view",

      description:
        "View administrator impersonation history.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.login",

      name: "View Login History",

      displayOrder: 9,

      action: "view",

      description:
        "View user login history and failed login attempts.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "audit.retention.manage",

      name: "Manage Audit Retention",

      displayOrder: 10,

      action: "manage",

      description:
        "Configure audit log retention policies.",

      dependencies: {
        allOf: ["audit.view"],
      },

      isSystem: true,

      introducedIn: "1.0.0",
    },
  ],
};