import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const systemModulePermission = {
  name: "System",
  slug: "system",
  icon: "Settings",
  displayOrder: 13,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const systemPermissions = [
  {
    key: "system.view",
    name: "View System",
    action: "view",
    description: "View system configuration and status.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.settings.manage",
    name: "Manage Settings",
    action: "manage",
    description: "Manage application settings.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.feature_flags.manage",
    name: "Manage Feature Flags",
    action: "manage",
    description: "Enable or disable application feature flags.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.maintenance.manage",
    name: "Manage Maintenance Mode",
    action: "manage",
    description: "Enable or disable maintenance mode.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.job.manage",
    name: "Manage Background Jobs",
    action: "manage",
    description: "Run, stop and monitor background jobs.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.cache.manage",
    name: "Manage Cache",
    action: "manage",
    description: "Clear and rebuild application caches.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.backup.manage",
    name: "Manage Backups",
    action: "manage",
    description: "Create and restore application backups.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.storage.manage",
    name: "Manage Storage",
    action: "manage",
    description: "Manage uploaded files and storage configuration.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.email.manage",
    name: "Manage Email Configuration",
    action: "manage",
    description: "Configure SMTP and email settings.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.payment.manage",
    name: "Manage Payment Gateways",
    action: "manage",
    description: "Configure payment gateway providers and credentials.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.api.manage",
    name: "Manage API Keys",
    action: "manage",
    description: "Manage API keys and third-party integrations.",
    displayOrder: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.security.manage",
    name: "Manage Security",
    action: "manage",
    description: "Manage security policies and authentication settings.",
    displayOrder: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.initialize",
    name: "Initialize System",
    action: "initialize",
    description: "Run one-time application initialization.",
    displayOrder: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.health.view",
    name: "View System Health",
    action: "view",
    description: "View system health, queues and service status.",
    displayOrder: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "system.version.view",
    name: "View System Version",
    action: "view",
    description: "View deployed application version and build information.",
    displayOrder: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedSystemModulePermissions1720800017 implements SeedInterface {
  name = "AddedSystemModuleAndPermissions1720800017";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: systemModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...systemModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(systemPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = systemPermissions.filter(
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
    const keys = systemPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
