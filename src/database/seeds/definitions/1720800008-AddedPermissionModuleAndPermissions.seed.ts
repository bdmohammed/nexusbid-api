import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const permissionModule = {
  name: "Permission",
  slug: "permission",
  icon: "KeyRound",
  displayOrder: 4,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const permissionPermissions = [
  {
    key: "permission.view",
    name: "View Permissions",
    action: "view",
    description: "View all permission modules and permissions.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.create",
    name: "Create Permissions",
    action: "create",
    description: "Create new custom permissions.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.update",
    name: "Update Permissions",
    action: "update",
    description: "Modify existing permissions.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.delete",
    name: "Delete Permissions",
    action: "delete",
    description: "Delete custom permissions.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.restore",
    name: "Restore Permissions",
    action: "restore",
    description: "Restore previously deleted permissions.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.export",
    name: "Export Permissions",
    action: "export",
    description: "Export permission definitions.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.sync",
    name: "Synchronize Permissions",
    action: "sync",
    description: "Synchronize seeded permissions with the database.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.review",
    name: "Review Permissions",
    action: "review",
    description:
      "Review newly introduced permissions before assigning them to roles.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.module.manage",
    name: "Manage Permission Modules",
    action: "manage",
    description: "Manage permission modules.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "permission.audit",
    name: "View Permission Audit",
    action: "audit",
    description: "View permission change history.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedPermissionModulePermissions1720800008 implements SeedInterface {
  name = "AddedPermissionModulePermissions1720800008";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: permissionModule.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...permissionModule,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(permissionPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = permissionPermissions.filter(
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
    const keys = permissionPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
