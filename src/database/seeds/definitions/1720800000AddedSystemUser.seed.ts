import * as crypto from 'node:crypto';

import * as bcrypt from 'bcryptjs';

import { AccountType, UserStatus } from '../../../types/enums';
import { User } from '../../entities/User';

import type { SeedInterface } from '../seed.interface';
import type { DataSource } from 'typeorm';
import { env } from '@/config/env';

export default class AddedSystemUser1720800000 implements SeedInterface {
  name = 'AddedSystemUser1720800000';

  public async up(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const email = env.NEXUSBID_SYSTEM_ADMIN_EMAIL;

    const exists = await userRepo.findOne({ where: { email } });
    if (exists) return;

    // Generate high-entropy password hash that nobody knows
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const systemUser = userRepo.create({
      name: 'System Service Account',
      email,
      passwordHash,
      accountType: AccountType.SYSTEM,
      emailVerified: true,
      isBlocked: false,
      status: UserStatus.ACTIVE,
      passwordChangedAt: new Date(),
    });

    await userRepo.save(systemUser);
  }

  public async down(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    await userRepo.delete({ email: env.NEXUSBID_SYSTEM_ADMIN_EMAIL });
  }
}
