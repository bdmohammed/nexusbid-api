import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const auditModulePermission = {
  name: "Audit Logs",
  slug: "audit",
  icon: "History",
  displayOrder: 12,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const auditPermissions = [
  {
    key: "audit.view",
    name: "View Audit Logs",
    action: "view",
    description: "View application audit logs.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.export",
    name: "Export Audit Logs",
    action: "export",
    description: "Export audit logs for compliance and reporting.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.search",
    name: "Search Audit Logs",
    action: "search",
    description: "Search and filter audit logs.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.user",
    name: "View User Activity",
    action: "view_user",
    description: "View audit history for specific users.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.role",
    name: "View Role Changes",
    action: "view_role",
    description: "View role and permission change history.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.system",
    name: "View System Events",
    action: "view_system",
    description: "View application startup, deployment and system events.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.security",
    name: "View Security Events",
    action: "view_security",
    description:
      "View authentication, authorization and security-related events.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.impersonation",
    name: "View Impersonation Logs",
    action: "view_impersonation",
    description: "View administrator impersonation history.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.login",
    name: "View Login History",
    action: "view_login",
    description: "View user login history and failed login attempts.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "audit.retention.manage",
    name: "Manage Audit Retention",
    action: "manage",
    description: "Configure audit log retention policies.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedAuditModuleAndPermissions1720800016 implements SeedInterface {
  name = "AddedAuditModuleAndPermissions1720800016";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: auditModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...auditModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(auditPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = auditPermissions.filter(
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
    const keys = auditPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
