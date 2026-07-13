import { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { DataSource, In } from "typeorm";

const cmsModulePermission = {
  name: "Content Management",
  slug: "cms",
  icon: "FileText",
  displayOrder: 10,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const cmsPermissions = [
  {
    key: "cms.view",
    name: "View CMS",
    action: "view",
    description: "View CMS pages, blogs and content.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.create",
    name: "Create Content",
    action: "create",
    description: "Create CMS pages and blog posts.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.update",
    name: "Update Content",
    action: "update",
    description: "Edit existing CMS content.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.delete",
    name: "Delete Content",
    action: "delete",
    description: "Delete CMS content.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.restore",
    name: "Restore Content",
    action: "restore",
    description: "Restore archived or deleted CMS content.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.publish",
    name: "Publish Content",
    action: "publish",
    description: "Publish draft content to the live website.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.unpublish",
    name: "Unpublish Content",
    action: "unpublish",
    description: "Move published content back to draft.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.archive",
    name: "Archive Content",
    action: "archive",
    description: "Archive CMS pages and blog posts.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.media.manage",
    name: "Manage Media",
    action: "manage",
    description: "Upload, replace and remove media assets.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.seo.manage",
    name: "Manage SEO",
    action: "manage",
    description: "Manage SEO metadata for CMS pages.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.export",
    name: "Export Content",
    action: "export",
    description: "Export CMS pages and blog posts.",
    displayOrder: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "cms.audit",
    name: "View CMS Audit",
    action: "audit",
    description: "View CMS content audit history.",
    displayOrder: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedCmsModuleAndPermissions1720800014 implements SeedInterface {
  name = "AddedCmsModuleAndPermissions1720800014";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: cmsModulePermission.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...cmsModulePermission,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(cmsPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = cmsPermissions.filter(
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
    const keys = cmsPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
