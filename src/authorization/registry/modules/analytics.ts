// src/authorization/registry/modules/analytics.ts

import type { ModuleDefinition } from "../types";

export const analyticsModule: ModuleDefinition = {
  slug: "analytics",

  name: "Analytics",

  icon: "BarChart3",

  displayOrder: 9,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "analytics.view",

      name: "View Analytics",

      displayOrder: 1,

      action: "view",

      description:
        "View dashboards, charts and business metrics.",

      introducedIn: "1.0.0",
    },

    {
      key: "analytics.export",

      name: "Export Analytics",

      displayOrder: 2,

      action: "export",

      description:
        "Export analytics reports.",

      dependencies: {
        allOf: ["analytics.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "analytics.schedule",

      name: "Schedule Reports",

      displayOrder: 3,

      action: "manage",

      description:
        "Create scheduled reports and email deliveries.",

      dependencies: {
        allOf: ["analytics.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "analytics.dashboard.manage",

      name: "Manage Dashboards",

      displayOrder: 4,

      action: "manage",

      description:
        "Create and configure analytics dashboards.",

      dependencies: {
        allOf: ["analytics.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "analytics.kpi.manage",

      name: "Manage KPI Widgets",

      displayOrder: 5,

      action: "manage",

      description:
        "Configure KPI cards and widgets.",

      dependencies: {
        allOf: ["analytics.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "analytics.audit",

      name: "View Analytics Audit",

      displayOrder: 6,

      action: "view",

      description:
        "View analytics configuration audit history.",

      dependencies: {
        allOf: ["analytics.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};