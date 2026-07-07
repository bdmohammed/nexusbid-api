import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Category } from '../../entities/Category';
import { State } from '../../entities/State';
import { Plan } from '../../entities/Plan';
import { FeatureCatalog } from '../../entities/FeatureCatalog';
import { PermissionModule } from '../../entities/PermissionModule';
import { Permission } from '../../entities/Permission';
import { Role } from '../../entities/Role';
import { UserRole } from '../../entities/UserRole';
import { AccountType } from '../../types/enums';
import { BCRYPT_ROUNDS, US_STATES } from '../../core/constants';
import { permissionsSeed } from './permissions';
import { permissionModulesSeed } from './permissionModule.seed';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { backfillHistoricalDevMetrics } from '../../modules/analytics/jobs/rollup.job';

const userRepo = AppDataSource.getRepository(User);
const categoryRepo = AppDataSource.getRepository(Category);
const stateRepo = AppDataSource.getRepository(State);
const planRepo = AppDataSource.getRepository(Plan);
const catalogRepo = AppDataSource.getRepository(FeatureCatalog);
const moduleRepo = AppDataSource.getRepository(PermissionModule);
const permRepo = AppDataSource.getRepository(Permission);
const roleRepo = AppDataSource.getRepository(Role);
const userRoleRepo = AppDataSource.getRepository(UserRole);

async function seedRBAC(): Promise<void> {
  logger.info('🌱 Seeding RBAC Modules, Permissions');

  // 1. Seed Modules
  for (const m of permissionModulesSeed) {
    let mod = await moduleRepo.findOne({ where: { slug: m.slug } });
    if (!mod) {
      mod = moduleRepo.create({
        name: m.name,
        slug: m.slug,
        icon: m.icon,
        displayOrder: m.displayOrder,
        isSystemModule: m.isSystemModule,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        deletedAt: m.deletedAt,
      });
      await moduleRepo.save(mod);
    }
  }
  logger.info('✓ Permission modules seeded.');

  // 2. Seed Permissions
  for (const p of permissionsSeed) {
    let perm = await permRepo.findOne({ where: { key: p.key } });
    let slug = p.key.split('.')[0];
    if (p.key.startsWith('ROLE_')) {
      slug = 'role';
    }
    const mod = await moduleRepo.findOne({ where: { slug } });
    if (!mod) {
      logger.warn({ permissionKey: p.key }, '✗ Module not found for permission');
      continue;
    }
    if (!perm) {
      perm = permRepo.create({
        moduleId: mod.id,
        name: p.name,
        key: p.key,
        action: p.action,
        description: p.description,
        isActive: p.isActive,
        displayOrder: p.displayOrder,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        deletedAt: p.deletedAt,
      });
      await permRepo.save(perm);
    }
  }
  logger.info('✓ Granular permissions seeded.');
}

async function seedStates(): Promise<void> {
  const count = await stateRepo.count();
  if (count > 0) {
    logger.info({ count }, '✓ States already seeded');
    return;
  }

  const states = US_STATES.map((s) => stateRepo.create(s));
  await stateRepo.save(states);
  logger.info({ count: states.length }, '✓ Seeded US states/territories');
}

async function seedFeatureCatalog(): Promise<void> {
  const count = await catalogRepo.count();
  if (count > 0) {
    logger.info({ count }, '✓ Feature catalog already seeded');
    return;
  }

  const features = [
    { featureKey: 'max_tenders', name: 'Max Bid Submissions', description: 'Maximum number of bids a vendor can submit per month.' },
    { featureKey: 'api_access', name: 'Developer API Access', description: 'Access to integrations and REST APIs.' },
    { featureKey: 'ai_search', name: 'AI Search Assistant', description: 'Use semantic search and smart RFP matchmakers.' },
    { featureKey: 'unlimited_documents', name: 'Unlimited Document Storage', description: 'Store infinite proposal versions.' },
  ];

  const items = features.map((f) => catalogRepo.create(f));
  await catalogRepo.save(items);
  logger.info({ count: items.length }, '✓ Seeded feature catalog items');
}

async function seedCategories(): Promise<void> {
  // Can be implemented if needed
}

async function main(): Promise<void> {
  logger.info('🌱 Starting database seed...');

  try {
    await AppDataSource.initialize();
    logger.info('✓ Database connected');

    await seedRBAC();
    await seedStates();
    await seedFeatureCatalog();
    await seedCategories();
    await backfillHistoricalDevMetrics();

    logger.info('✅ Seed complete!');
    logger.warn('Remember to:');
    logger.warn('   1. Create PayPal Products + Billing Plans in your PayPal dashboard');
    logger.warn('   2. Update plans.paypalPlanId for each plan in the DB');
    logger.warn('   3. Set PAYPAL_WEBHOOK_ID in your .env file');
  } catch (err) {
    logger.error({ err }, '❌ Seed failed');
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
