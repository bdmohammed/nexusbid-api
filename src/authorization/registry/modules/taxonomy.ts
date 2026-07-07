// src/authorization/registry/modules/taxonomy.ts

import { ModuleDefinition } from "../types";

export const taxonomyModule: ModuleDefinition = {
  slug: "taxonomy",

  name: "Taxonomy",

  icon: "Shapes",

  displayOrder: 6,

  introducedIn: "1.0.0",

  permissions: [
    // ----------------------------
    // Categories
    // ----------------------------

    {
      key: "category.view",

      name: "View Categories",

      displayOrder: 1,

      action: "view",

      description: "View category hierarchy.",

      introducedIn: "1.0.0",
    },

    {
      key: "category.create",

      name: "Create Categories",

      displayOrder: 2,

      action: "create",

      description: "Create new categories.",

      dependencies: {
        allOf: ["category.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "category.update",

      name: "Update Categories",

      displayOrder: 3,

      action: "update",

      description: "Modify categories.",

      dependencies: {
        allOf: ["category.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "category.delete",

      name: "Delete Categories",

      displayOrder: 4,

      action: "delete",

      description: "Soft delete categories.",

      dependencies: {
        allOf: ["category.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "category.restore",

      name: "Restore Categories",

      displayOrder: 5,

      action: "restore",

      description: "Restore deleted categories.",

      dependencies: {
        allOf: [
          "category.view",
          "category.delete",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "category.export",

      name: "Export Categories",

      displayOrder: 6,

      action: "export",

      description: "Export category data.",

      dependencies: {
        allOf: ["category.view"],
      },

      introducedIn: "1.0.0",
    },

    // ----------------------------
    // States
    // ----------------------------

    {
      key: "state.view",

      name: "View States",

      displayOrder: 10,

      action: "view",

      description: "View states.",

      introducedIn: "1.0.0",
    },

    {
      key: "state.create",

      name: "Create States",

      displayOrder: 11,

      action: "create",

      description: "Create new states.",

      dependencies: {
        allOf: ["state.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "state.update",

      name: "Update States",

      displayOrder: 12,

      action: "update",

      description: "Modify states.",

      dependencies: {
        allOf: ["state.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "state.delete",

      name: "Delete States",

      displayOrder: 13,

      action: "delete",

      description: "Delete states.",

      dependencies: {
        allOf: ["state.view"],
      },

      introducedIn: "1.0.0",
    },

    // ----------------------------
    // Departments
    // ----------------------------

    {
      key: "department.view",

      name: "View Departments",

      displayOrder: 20,

      action: "view",

      description: "View departments.",

      introducedIn: "1.0.0",
    },

    {
      key: "department.create",

      name: "Create Departments",

      displayOrder: 21,

      action: "create",

      description: "Create departments.",

      dependencies: {
        allOf: ["department.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "department.update",

      name: "Update Departments",

      displayOrder: 22,

      action: "update",

      description: "Update departments.",

      dependencies: {
        allOf: ["department.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "department.delete",

      name: "Delete Departments",

      displayOrder: 23,

      action: "delete",

      description: "Delete departments.",

      dependencies: {
        allOf: ["department.view"],
      },

      introducedIn: "1.0.0",
    },

    // ----------------------------
    // Organizations
    // ----------------------------

    {
      key: "organization.view",

      name: "View Organizations",

      displayOrder: 30,

      action: "view",

      description: "View organizations.",

      introducedIn: "1.0.0",
    },

    {
      key: "organization.create",

      name: "Create Organizations",

      displayOrder: 31,

      action: "create",

      description: "Create organizations.",

      dependencies: {
        allOf: ["organization.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "organization.update",

      name: "Update Organizations",

      displayOrder: 32,

      action: "update",

      description: "Update organizations.",

      dependencies: {
        allOf: ["organization.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "organization.delete",

      name: "Delete Organizations",

      displayOrder: 33,

      action: "delete",

      description: "Delete organizations.",

      dependencies: {
        allOf: ["organization.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};