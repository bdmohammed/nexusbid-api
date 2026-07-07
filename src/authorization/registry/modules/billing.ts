// src/authorization/registry/modules/billing.ts

import { ModuleDefinition } from "../types";

export const billingModule: ModuleDefinition = {
  slug: "billing",

  name: "Billing & Subscriptions",

  icon: "CreditCard",

  displayOrder: 7,

  introducedIn: "1.0.0",

  permissions: [
    // ---------------------------------
    // Subscription
    // ---------------------------------

    {
      key: "subscription.view",

      name: "View Subscriptions",

      displayOrder: 1,

      action: "view",

      description:
        "View subscriptions, plans and customer subscription details.",

      introducedIn: "1.0.0",
    },

    {
      key: "subscription.create",

      name: "Create Subscription",

      displayOrder: 2,

      action: "create",

      description:
        "Create subscriptions manually.",

      dependencies: {
        allOf: ["subscription.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "subscription.update",

      name: "Update Subscription",

      displayOrder: 3,

      action: "update",

      description:
        "Update subscription information.",

      dependencies: {
        allOf: ["subscription.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "subscription.cancel",

      name: "Cancel Subscription",

      displayOrder: 4,

      action: "custom",

      description:
        "Cancel customer subscriptions.",

      dependencies: {
        allOf: ["subscription.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "subscription.resume",

      name: "Resume Subscription",

      displayOrder: 5,

      action: "custom",

      description:
        "Resume cancelled subscriptions.",

      dependencies: {
        allOf: ["subscription.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "subscription.change_plan",

      name: "Change Plan",

      displayOrder: 6,

      action: "manage",

      description:
        "Upgrade or downgrade subscription plans.",

      dependencies: {
        allOf: ["subscription.view"],
      },

      introducedIn: "1.0.0",
    },

    // ---------------------------------
    // Plans
    // ---------------------------------

    {
      key: "plan.view",

      name: "View Plans",

      displayOrder: 20,

      action: "view",

      description:
        "View subscription plans.",

      introducedIn: "1.0.0",
    },

    {
      key: "plan.create",

      name: "Create Plans",

      displayOrder: 21,

      action: "create",

      description:
        "Create subscription plans.",

      dependencies: {
        allOf: ["plan.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "plan.update",

      name: "Update Plans",

      displayOrder: 22,

      action: "update",

      description:
        "Modify subscription plans.",

      dependencies: {
        allOf: ["plan.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "plan.delete",

      name: "Delete Plans",

      displayOrder: 23,

      action: "delete",

      description:
        "Delete subscription plans.",

      dependencies: {
        allOf: ["plan.view"],
      },

      introducedIn: "1.0.0",
    },

    // ---------------------------------
    // Payments
    // ---------------------------------

    {
      key: "payment.view",

      name: "View Payments",

      displayOrder: 40,

      action: "view",

      description:
        "View payment transactions.",

      introducedIn: "1.0.0",
    },

    {
      key: "payment.refund",

      name: "Refund Payments",

      displayOrder: 41,

      action: "manage",

      description:
        "Refund completed payments.",

      dependencies: {
        allOf: ["payment.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "payment.export",

      name: "Export Payments",

      displayOrder: 42,

      action: "export",

      description:
        "Export payment reports.",

      dependencies: {
        allOf: ["payment.view"],
      },

      introducedIn: "1.0.0",
    },

    // ---------------------------------
    // Coupons
    // ---------------------------------

    {
      key: "coupon.view",

      name: "View Coupons",

      displayOrder: 60,

      action: "view",

      description:
        "View discount coupons.",

      introducedIn: "1.0.0",
    },

    {
      key: "coupon.create",

      name: "Create Coupons",

      displayOrder: 61,

      action: "create",

      description:
        "Create discount coupons.",

      dependencies: {
        allOf: ["coupon.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "coupon.update",

      name: "Update Coupons",

      displayOrder: 62,

      action: "update",

      description:
        "Update coupon information.",

      dependencies: {
        allOf: ["coupon.view"],
      },

      introducedIn: "1.0.0",
    },

    {
      key: "coupon.delete",

      name: "Delete Coupons",

      displayOrder: 63,

      action: "delete",

      description:
        "Delete coupons.",

      dependencies: {
        allOf: ["coupon.view"],
      },

      introducedIn: "1.0.0",
    },

    // ---------------------------------
    // Invoice
    // ---------------------------------

    {
      key: "invoice.view",

      name: "View Invoices",

      displayOrder: 80,

      action: "view",

      description:
        "View invoices.",

      introducedIn: "1.0.0",
    },

    {
      key: "invoice.export",

      name: "Export Invoices",

      displayOrder: 81,

      action: "export",

      description:
        "Export invoices.",

      dependencies: {
        allOf: ["invoice.view"],
      },

      introducedIn: "1.0.0",
    },
  ],
};