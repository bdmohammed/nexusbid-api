import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const analyticsModulePermission = {
  name: "Analytics",
  slug: "analytic",
  icon: "BarChart3",
  displayOrder: 9,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const analyticsPermissions = [
  {
    key: "analytics.view",
    name: "View BI Overview",
    action: "view",
    description:
      "View dashboard overview, general tenders and categories distribution.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.export",
    name: "Export BI Data",
    action: "export",
    description: "Initiate asynchronous data exports for reports.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.financial",
    name: "View Financial Analytics",
    action: "view_financial",
    description:
      "Access billing summaries, ARR/MRR trends, and revenue collections.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.users",
    name: "View User Analytics",
    action: "view_users",
    description:
      "View customer registrations, active account types, and user sessions.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.vendors",
    name: "View Vendor Analytics",
    action: "view_vendors",
    description:
      "Access vendor performance charts, bid win ratios, and leaderboards.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.system",
    name: "View System Analytics",
    action: "view_system",
    description:
      "View server latency, queue depth, cache hits, and background execution logs.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.reports",
    name: "Manage Scheduled Reports",
    action: "manage_reports",
    description: "Configure and automate report emails to roles or webhooks.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    key: "analytics.ai",
    name: "Access AI Insights",
    action: "access_ai",
    description:
      "Receive predictions, churn forecasting, and procurement demand suggestions.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedAnalyticsModuleAndPermissions1720800013 implements SeedInterface {
  name = "AddedAnalyticsModuleAndPermissions1720800013";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: analyticsModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...analyticsModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(analyticsPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = analyticsPermissions.filter(
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
    const keys = analyticsPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
