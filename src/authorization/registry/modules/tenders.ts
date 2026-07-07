// src/authorization/registry/modules/tenders.ts

import { ModuleDefinition } from "../types";

export const tendersModule: ModuleDefinition = {
  slug: "tenders",

  name: "Tender Management",

  icon: "FileSpreadsheet",

  displayOrder: 5,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "tender.view",

      name: "View Tenders",

      displayOrder: 1,

      action: "view",

      description:
        "View tenders and tender details.",

      introducedIn: "1.0.0",
    },

    {
      key: "tender.create",

      name: "Create Tender",

      displayOrder: 2,

      action: "create",

      description:
        "Create new tenders.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.update",

      name: "Update Tender",

      displayOrder: 3,

      action: "update",

      description:
        "Edit existing tenders.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.delete",

      name: "Delete Tender",

      displayOrder: 4,

      action: "delete",

      description:
        "Soft delete tenders.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.restore",

      name: "Restore Tender",

      displayOrder: 5,

      action: "restore",

      description:
        "Restore deleted tenders.",

      dependencies: {
        allOf: [
          "tender.view",
          "tender.delete",
        ],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.publish",

      name: "Publish Tender",

      displayOrder: 6,

      action: "publish",

      description:
        "Publish draft tenders.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.unpublish",

      name: "Unpublish Tender",

      displayOrder: 7,

      action: "custom",

      description:
        "Move published tenders back to draft.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.approve",

      name: "Approve Tender",

      displayOrder: 8,

      action: "approve",

      description:
        "Approve tenders awaiting review.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.reject",

      name: "Reject Tender",

      displayOrder: 9,

      action: "reject",

      description:
        "Reject tenders awaiting approval.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.archive",

      name: "Archive Tender",

      displayOrder: 10,

      action: "archive",

      description:
        "Archive completed or expired tenders.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.upload_document",

      name: "Upload Documents",

      displayOrder: 11,

      action: "manage",

      description:
        "Upload tender related documents.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.delete_document",

      name: "Delete Documents",

      displayOrder: 12,

      action: "manage",

      description:
        "Delete tender documents.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.export",

      name: "Export Tenders",

      displayOrder: 13,

      action: "export",

      description:
        "Export tender data.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "tender.audit",

      name: "View Tender Audit",

      displayOrder: 14,

      action: "view",

      description:
        "View tender audit history.",

      dependencies: {
        allOf: ["tender.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};