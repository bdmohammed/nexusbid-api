// src/authorization/registry/modules/support.ts

import type { ModuleDefinition } from "../types";

export const supportModule: ModuleDefinition = {
  slug: "support",

  name: "Support",

  icon: "LifeBuoy",

  displayOrder: 8,

  introducedIn: "1.0.0",

  permissions: [
    {
      key: "ticket.view",

      name: "View Tickets",

      displayOrder: 1,

      action: "view",

      description:
        "View support tickets.",

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.create",

      name: "Create Tickets",

      displayOrder: 2,

      action: "create",

      description:
        "Create support tickets on behalf of customers.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.update",

      name: "Update Tickets",

      displayOrder: 3,

      action: "update",

      description:
        "Edit ticket information.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.delete",

      name: "Delete Tickets",

      displayOrder: 4,

      action: "delete",

      description:
        "Delete support tickets.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.assign",

      name: "Assign Tickets",

      displayOrder: 5,

      action: "manage",

      description:
        "Assign tickets to support agents.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.reply",

      name: "Reply Tickets",

      displayOrder: 6,

      action: "manage",

      description:
        "Reply to customer tickets.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.close",

      name: "Close Tickets",

      displayOrder: 7,

      action: "manage",

      description:
        "Close resolved tickets.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.reopen",

      name: "Reopen Tickets",

      displayOrder: 8,

      action: "manage",

      description:
        "Reopen closed tickets.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.export",

      name: "Export Tickets",

      displayOrder: 9,

      action: "export",

      description:
        "Export ticket reports.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "ticket.audit",

      name: "View Ticket Audit",

      displayOrder: 10,

      action: "view",

      description:
        "View ticket activity history.",

      dependencies: {
        allOf: ["ticket.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};