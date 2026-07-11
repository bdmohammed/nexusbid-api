import { appDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { US_STATES } from '../../core/constants';
import { FeatureCatalog } from '../../entities/FeatureCatalog';
import { Permission } from '../../entities/Permission';
import { PermissionModule } from '../../entities/PermissionModule';
import { State } from '../../entities/State';
import { backfillHistoricalDevMetrics } from '../../modules/analytics/jobs/rollup.job';

import { permissionModulesSeed } from './permissionModule.seed';
import { permissionsSeed } from './permissions';

import 'reflect-metadata';

const stateRepo = appDataSource.getRepository(State);
const catalogRepo = appDataSource.getRepository(FeatureCatalog);
const moduleRepo = appDataSource.getRepository(PermissionModule);
const permRepo = appDataSource.getRepository(Permission);

async function seedRBAC(): Promise<void> {
  logger.info('🌱 Seeding RBAC Modules, Permissions');

  // 1. Seed Modules
  const existingModules = await moduleRepo.find();
  const existingSlugs = new Set(existingModules.map((m) => m.slug));

  const modulesToCreate = [];
  for (const m of permissionModulesSeed) {
    if (!existingSlugs.has(m.slug)) {
      modulesToCreate.push(
        moduleRepo.create({
          name: m.name,
          slug: m.slug,
          icon: m.icon,
          displayOrder: m.displayOrder,
          isSystemModule: m.isSystemModule,
          isActive: m.isActive,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          deletedAt: m.deletedAt,
        }),
      );
    }
  }

  if (modulesToCreate.length > 0) {
    await moduleRepo.save(modulesToCreate);
  }
  logger.info('✓ Permission modules seeded.');

  // Fetch updated list of modules to map slugs to IDs
  const allModules = await moduleRepo.find();
  const moduleBySlug = new Map(allModules.map((m) => [m.slug, m]));

  // 2. Seed Permissions
  const existingPermissions = await permRepo.find();
  const existingPermKeys = new Set(existingPermissions.map((p) => p.key));

  const permsToCreate = [];
  for (const p of permissionsSeed) {
    let slug = p.key.split('.')[0] as string;
    if (p.key.startsWith('ROLE_')) {
      slug = 'role';
    }
    const mod = moduleBySlug.get(slug);
    if (!mod) {
      logger.warn({ permissionKey: p.key }, '✗ Module not found for permission');
      continue;
    }
    if (!existingPermKeys.has(p.key)) {
      permsToCreate.push(
        permRepo.create({
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
        }),
      );
    }
  }

  if (permsToCreate.length > 0) {
    await permRepo.save(permsToCreate);
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
    {
      featureKey: 'max_tenders',
      name: 'Max Bid Submissions',
      description: 'Maximum number of bids a vendor can submit per month.',
    },
    {
      featureKey: 'api_access',
      name: 'Developer API Access',
      description: 'Access to integrations and REST APIs.',
    },
    {
      featureKey: 'ai_search',
      name: 'AI Search Assistant',
      description: 'Use semantic search and smart RFP matchmakers.',
    },
    {
      featureKey: 'unlimited_documents',
      name: 'Unlimited Document Storage',
      description: 'Store infinite proposal versions.',
    },
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
    await appDataSource.initialize();
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
    await appDataSource.destroy();
  }
}

main();
