import type { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { type DataSource, In } from "typeorm";

const rolePermissionModule = {
  name: "Role",
  slug: "role",
  icon: "ShieldCheck",
  displayOrder: 3,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const rolePermissions = [
  {
    key: "ROLE_VIEW",
    name: "View Roles",
    action: "view",
    description: "View roles, versions, and configurations.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_CREATE",
    name: "Create Roles",
    action: "create",
    description: "Create new role drafts and versions.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_UPDATE",
    name: "Update Roles",
    action: "update",
    description: "Modify role drafts and metadata.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_DELETE",
    name: "Delete Roles",
    action: "delete",
    description: "Delete custom roles.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_REVIEW",
    name: "Review Roles",
    action: "review",
    description: "Access the role review queue.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_APPROVE",
    name: "Approve Roles",
    action: "approve",
    description: "Approve pending role versions.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_REJECT",
    name: "Reject Roles",
    action: "reject",
    description: "Reject pending role versions.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_ASSIGN",
    name: "Assign Roles",
    action: "assign",
    description: "Assign or revoke roles from users.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_EXPORT",
    name: "Export Roles",
    action: "export",
    description: "Export roles and permissions.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_RESTORE",
    name: "Restore Roles",
    action: "restore",
    description: "Restore archived roles.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_ARCHIVE",
    name: "Archive Roles",
    action: "archive",
    description: "Soft-delete roles by archiving them.",
    displayOrder: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_COMPARE",
    name: "Compare Roles",
    action: "compare",
    description: "Compare different versions of a role.",
    displayOrder: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "ROLE_AUDIT_VIEW",
    name: "View Audit Logs",
    action: "audit_view",
    description: "View RBAC security audit logs.",
    displayOrder: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedRoleModuleAndPermissions1720800007 implements SeedInterface {
  name = "AddedRoleModuleAndPermissions1720800007";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: rolePermissionModule.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...rolePermissionModule,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(rolePermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = rolePermissions.filter(
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
    const keys = rolePermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
