import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const categoryModulePermission = {
  name: "Categories",
  slug: "category",
  icon: "Shapes",
  displayOrder: 6,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const categoryPermissions = [
  {
    key: "category.view",
    name: "View Categories",
    action: "view",
    description: "View category hierarchy.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "category.create",
    name: "Create Categories",
    action: "create",
    description: "Create new categories.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "category.update",
    name: "Update Categories",
    action: "update",
    description: "Update existing categories.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "category.delete",
    name: "Delete Categories",
    action: "delete",
    description: "Delete categories.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "category.restore",
    name: "Restore Categories",
    action: "restore",
    description: "Restore deleted categories.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "category.export",
    name: "Export Categories",
    action: "export",
    description: "Export category data.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedCategoryModueAndPermissions1720800010 implements SeedInterface {
  name = "AddedCategoryModuleAndPermissions1720800010";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: categoryModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...categoryModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(categoryPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = categoryPermissions.filter(
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
    const keys = categoryPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
