import { type DataSource, In } from 'typeorm';

import { Permission } from '../../entities/Permission';
import { PermissionModule } from '../../entities/PermissionModule';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/database/entities/User';
import { notificationPermissionModule, NotificationPermissions } from '@/constants/permissions';

const notificationPermissions = Object.values(NotificationPermissions);

export default class AddedNotificationModuleAndPermissions1720800015 implements SeedInterface {
  name = 'AddedNotificationModuleAndPermission1720800015';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }
    const permRepo = dataSource.getRepository(Permission);
    const moduleRepo = dataSource.getRepository(PermissionModule);

    let module = await moduleRepo.findOne({
      where: { key: notificationPermissionModule.key },
    });
    module ??= await moduleRepo.save(
      moduleRepo.create({
        ...notificationPermissionModule,
        createdById: systemUser.id,
        updatedById: systemUser.id,
      }),
    );

    const existingPermissions = await permRepo.find({
      where: { key: In(notificationPermissions.map((p) => p.key)) },
      select: ['key'],
    });
    const existingKeys = new Set(existingPermissions.map((p) => p.key));

    const newPermissions = notificationPermissions.filter((p) => !existingKeys.has(p.key));
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
    const keys = notificationPermissions.map((p) => p.key);
    await permRepo.delete({ key: In(keys) });
  }
}
