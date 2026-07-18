import { type DataSource, In } from 'typeorm';

import { Permission } from '../../entities/Permission';
import { PermissionModule } from '../../entities/PermissionModule';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/database/entities/User';
import { cmsPermissionModule, CmsPermissions } from '@/constants/permissions';

const cmsPermissions = Object.values(CmsPermissions);

export default class AddedCmsModuleAndPermissions1720800014 implements SeedInterface {
  name = 'AddedCmsModuleAndPermissions1720800014';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { key: cmsPermissionModule.key },
    });
    module ??= await moduleRepo.save(
      moduleRepo.create({
        ...cmsPermissionModule,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      }),
    );

    const existingPermissions = await permRepo.find({
      where: { key: In(cmsPermissions.map((p) => p.key)) },
      select: ['key'],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = cmsPermissions.filter((p) => !existingKeys.has(p.key));
    if (newPermissions.length > 0) {
      const permissions = newPermissions.map((p) =>
        permRepo.create({
          moduleId: module.id,
          ...p,
          createdById: systemUser.id,
          updatedById: systemUser.id,
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
