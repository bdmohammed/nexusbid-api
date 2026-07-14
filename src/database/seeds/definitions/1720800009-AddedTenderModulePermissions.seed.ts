import type { SeedInterface } from "../seed.interface";
import { Permission } from "../../entities/Permission";
import { PermissionModule } from "../../entities/PermissionModule";
import { type DataSource, In } from "typeorm";

const tenderPermissionModule = {
  name: "Tender Management",
  slug: "tender",
  icon: "FileSpreadsheet",
  displayOrder: 5,
  isSystemModule: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const tenderPermissions = [
  {
    key: "tender.view",
    name: "View Tenders",
    action: "view",
    description: "View tenders and tender details.",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.create",
    name: "Create Tender",
    action: "create",
    description: "Create new tenders.",
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.update",
    name: "Update Tender",
    action: "update",
    description: "Edit existing tenders.",
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.delete",
    name: "Delete Tender",
    action: "delete",
    description: "Soft delete tenders.",
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.restore",
    name: "Restore Tender",
    action: "restore",
    description: "Restore previously deleted tenders.",
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.publish",
    name: "Publish Tender",
    action: "publish",
    description: "Publish draft tenders.",
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.unpublish",
    name: "Unpublish Tender",
    action: "unpublish",
    description: "Move published tenders back to draft.",
    displayOrder: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.approve",
    name: "Approve Tender",
    action: "approve",
    description: "Approve tenders awaiting review.",
    displayOrder: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.reject",
    name: "Reject Tender",
    action: "reject",
    description: "Reject tenders awaiting approval.",
    displayOrder: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.archive",
    name: "Archive Tender",
    action: "archive",
    description: "Archive completed or expired tenders.",
    displayOrder: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.upload_document",
    name: "Upload Documents",
    action: "upload",
    description: "Upload tender related documents.",
    displayOrder: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.delete_document",
    name: "Delete Documents",
    action: "delete_document",
    description: "Delete tender related documents.",
    displayOrder: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.export",
    name: "Export Tenders",
    action: "export",
    description: "Export tender data.",
    displayOrder: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: "tender.audit",
    name: "View Tender Audit",
    action: "audit",
    description: "View tender audit history.",
    displayOrder: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

export default class AddedTenderModuleAndPermissions1720800009 implements SeedInterface {
  name = "AddedTenderModuleAndPermissions1720800009";

  public async up(dataSource: DataSource): Promise<void> {
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { slug: tenderPermissionModule.slug },
    });
    if (!module) {
      module = await moduleRepo.save(
        moduleRepo.create({
          ...tenderPermissionModule,
        }),
      );
    }

    const existingPermissions = await permRepo.find({
      where: { key: In(tenderPermissions.map((p) => p.key)) },
      select: ["key"],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = tenderPermissions.filter(
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
    const keys = tenderPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
