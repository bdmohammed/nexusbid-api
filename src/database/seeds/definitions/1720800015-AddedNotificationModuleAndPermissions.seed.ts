import type { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { type DataSource, In } from "typeorm";

const notificationModulePermission = {
  name: "Notification",
  slug: "notification",
  icon: "Bell",
  displayOrder: 11,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const notificationPermissions = [
  // ==========================================================
  // Notifications
  // ==========================================================

  {
    key: "notification.view",
    name: "View Notifications",
    action: "view",
    description: "View system notifications and notification history.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.create",
    name: "Create Notification",
    action: "create",
    description: "Create new notifications.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.update",
    name: "Update Notification",
    action: "update",
    description: "Modify notification content.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.delete",
    name: "Delete Notification",
    action: "delete",
    description: "Delete notifications.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.send",
    name: "Send Notification",
    action: "send",
    description: "Send notifications to users.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.schedule",
    name: "Schedule Notification",
    action: "schedule",
    description: "Schedule notifications for future delivery.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.cancel",
    name: "Cancel Scheduled Notification",
    action: "cancel",
    description: "Cancel scheduled notifications.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Notification Templates
  // ==========================================================

  {
    key: "notification.template.view",
    name: "View Templates",
    action: "view",
    description: "View notification templates.",
    displayOrder: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.template.create",
    name: "Create Templates",
    action: "create",
    description: "Create notification templates.",
    displayOrder: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.template.update",
    name: "Update Templates",
    action: "update",
    description: "Modify notification templates.",
    displayOrder: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.template.delete",
    name: "Delete Templates",
    action: "delete",
    description: "Delete notification templates.",
    displayOrder: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Preferences
  // ==========================================================

  {
    key: "notification.preference.manage",
    name: "Manage Notification Preferences",
    action: "manage",
    description: "Manage email, SMS, push and in-app notification preferences.",
    displayOrder: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  // ==========================================================
  // Audit & Export
  // ==========================================================

  {
    key: "notification.audit",
    name: "View Notification Audit",
    action: "audit",
    description: "View notification delivery history and audit logs.",
    displayOrder: 50,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "notification.export",
    name: "Export Notifications",
    action: "export",
    description: "Export notification reports.",
    displayOrder: 51,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedNotificationModuleAndPermissions1720800015 implements SeedInterface {
  name = "AddedNotificationModuleAndPermission1720800015";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: notificationModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...notificationModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(notificationPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = notificationPermissions.filter(
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
    const keys = notificationPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
