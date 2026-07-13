import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const billingModulePermission = {
  name: "Billing & Subscriptions",
  slug: "billing",
  icon: "CreditCard",
  displayOrder: 7,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const billingPermissions = [
  // ==========================================================
  // Subscriptions
  // ==========================================================

  {
    key: "subscription.view",
    name: "View Subscriptions",
    action: "view",
    description: "View subscriptions, plans and customer subscription details.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "subscription.create",
    name: "Create Subscription",
    action: "create",
    description: "Create subscriptions manually.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "subscription.update",
    name: "Update Subscription",
    action: "update",
    description: "Update subscription information.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "subscription.cancel",
    name: "Cancel Subscription",
    action: "cancel",
    description: "Cancel customer subscriptions.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "subscription.resume",
    name: "Resume Subscription",
    action: "resume",
    description: "Resume cancelled subscriptions.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "subscription.change_plan",
    name: "Change Subscription Plan",
    action: "change_plan",
    description: "Upgrade or downgrade customer subscription plans.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Plans
  // ==========================================================

  {
    key: "plan.view",
    name: "View Plans",
    action: "view",
    description: "View subscription plans.",
    displayOrder: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "plan.create",
    name: "Create Plans",
    action: "create",
    description: "Create subscription plans.",
    displayOrder: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "plan.update",
    name: "Update Plans",
    action: "update",
    description: "Modify subscription plans.",
    displayOrder: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "plan.delete",
    name: "Delete Plans",
    action: "delete",
    description: "Delete subscription plans.",
    displayOrder: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Payments
  // ==========================================================

  {
    key: "payment.view",
    name: "View Payments",
    action: "view",
    description: "View payment transactions.",
    displayOrder: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "payment.refund",
    name: "Refund Payments",
    action: "refund",
    description: "Refund completed payments.",
    displayOrder: 41,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "payment.export",
    name: "Export Payments",
    action: "export",
    description: "Export payment reports.",
    displayOrder: 42,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Coupons
  // ==========================================================

  {
    key: "coupon.view",
    name: "View Coupons",
    action: "view",
    description: "View discount coupons.",
    displayOrder: 60,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "coupon.create",
    name: "Create Coupons",
    action: "create",
    description: "Create discount coupons.",
    displayOrder: 61,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "coupon.update",
    name: "Update Coupons",
    action: "update",
    description: "Update coupon information.",
    displayOrder: 62,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "coupon.delete",
    name: "Delete Coupons",
    action: "delete",
    description: "Delete coupons.",
    displayOrder: 63,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Invoices
  // ==========================================================

  {
    key: "invoice.view",
    name: "View Invoices",
    action: "view",
    description: "View invoices.",
    displayOrder: 80,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "invoice.export",
    name: "Export Invoices",
    action: "export",
    description: "Export invoices.",
    displayOrder: 81,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedBillingModuleAndPermissions1720800011 implements SeedInterface {
  name = "AddedBillingModuleAndPermissions1720800011";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: billingModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...billingModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(billingPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = billingPermissions.filter(
      (p) => !existingKeys.has(p.key),
    );
    if (newPermissions.length > 0) {
      const permissions = newPermissions.map((p) =>
        permRepo.create({
          moduleId: module.id,
          ...p,
        }),
      );
      await permRepo.save(permissions);
    }
  }

  public async down(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const keys = billingPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
