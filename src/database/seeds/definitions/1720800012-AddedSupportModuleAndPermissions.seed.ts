import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const supportModulePermission = {
  name: "Support",
  slug: "support",
  icon: "LifeBuoy",
  displayOrder: 8,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const supportPermissions = [
  // ==========================================================
  // Support Tickets
  // ==========================================================

  {
    key: "ticket.view",
    name: "View Tickets",
    action: "view",
    description: "View customer support tickets.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.create",
    name: "Create Tickets",
    action: "create",
    description: "Create support tickets on behalf of customers.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.update",
    name: "Update Tickets",
    action: "update",
    description: "Update support ticket information.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.delete",
    name: "Delete Tickets",
    action: "delete",
    description: "Delete support tickets.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.assign",
    name: "Assign Tickets",
    action: "assign",
    description: "Assign tickets to support agents.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.reply",
    name: "Reply to Tickets",
    action: "reply",
    description: "Reply to customer support tickets.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.close",
    name: "Close Tickets",
    action: "close",
    description: "Close resolved support tickets.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.reopen",
    name: "Reopen Tickets",
    action: "reopen",
    description: "Reopen previously closed tickets.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.export",
    name: "Export Tickets",
    action: "export",
    description: "Export support ticket reports.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "ticket.audit",
    name: "View Ticket Audit",
    action: "audit",
    description: "View support ticket activity history.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedSupportModuleAndPermissions1720800012 implements SeedInterface {
  name = "AddedSupportModuleAndPermissions1720800012";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: supportModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...supportModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(supportPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = supportPermissions.filter(
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
    const keys = supportPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
