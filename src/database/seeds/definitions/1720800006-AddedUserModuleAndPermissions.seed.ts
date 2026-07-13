import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const userPermissionModule = {
  name: "User",
  slug: "user",
  icon: "User",
  displayOrder: 2,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const userPermissions = [
  {
    key: "user.view",
    name: "View Users",
    action: "view",
    description: "View users and user profiles.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.create",
    name: "Create Users",
    action: "create",
    description: "Create new user accounts.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.update",
    name: "Update Users",
    action: "update",
    description: "Edit user information.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.delete",
    name: "Delete Users",
    action: "delete",
    description: "Soft delete user accounts.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.restore",
    name: "Restore Users",
    action: "restore",
    description: "Restore previously deleted user accounts.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.block",
    name: "Block Users",
    action: "block",
    description: "Block users from accessing the application.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.unblock",
    name: "Unblock Users",
    action: "unblock",
    description: "Unblock previously blocked users.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.assign_role",
    name: "Assign Roles",
    action: "assign",
    description: "Assign one or more roles to admin users.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.remove_role",
    name: "Remove Roles",
    action: "remove",
    description: "Remove assigned roles from admin users.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.reset_password",
    name: "Reset Password",
    action: "reset_password",
    description: "Reset another user's password.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.impersonate",
    name: "Impersonate User",
    action: "impersonate",
    description:
      "Temporarily access another user account for support purposes.",
    displayOrder: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "user.export",
    name: "Export Users",
    action: "export",
    description: "Export user information.",
    displayOrder: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedUserModuleAndPermissions1720800006 implements SeedInterface {
  name = "AddedUserModulleAndPermissions1720800006";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: userPermissionModule.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...userPermissionModule,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(userPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = userPermissions.filter(
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
    const keys = userPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
