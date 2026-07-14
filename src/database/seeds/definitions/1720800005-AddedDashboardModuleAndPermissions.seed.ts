import type { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { type DataSource, In } from "typeorm";

const dashboardPermissionModule = {
  name: "Dashboard",
  slug: "dashboard",
  icon: "LayoutDashboard",
  displayOrder: 1,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const dashboardPermissions = [
  {
    key: "dashboard.view",
    name: "View Dashboard",
    action: "view",
    description:
      "Access the administration dashboard and view system overview.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "dashboard.export",
    name: "Export Dashboard",
    action: "export",
    description: "Export dashboard charts, reports and summary statistics.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedDashboardModuleAndPermissions1720800005 implements SeedInterface {
  name = "AddedDashboardModuleAndPermissions1720800005";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: dashboardPermissionModule.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...dashboardPermissionModule,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(dashboardPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = dashboardPermissions.filter(
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
    const keys = dashboardPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
