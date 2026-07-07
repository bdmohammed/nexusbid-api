import { ModuleDefinition } from "../types";

export const dashboardModule: ModuleDefinition = {
  slug: "dashboard",

  name: "Dashboard",

  icon: "LayoutDashboard",

  displayOrder: 1,

  isSystem: true,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "dashboard.view",

      name: "View Dashboard",

      displayOrder: 1,

      action: "view",

      description:
        "Access the administration dashboard and view system overview.",

      isSystem: true,

      introducedIn: "1.0.0",
    },

    {
      key: "dashboard.export",

      name: "Export Dashboard",

      displayOrder: 2,

      action: "export",

      description:
        "Export dashboard charts, reports and summary statistics.",

      dependencies: {
        allOf: ["dashboard.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};