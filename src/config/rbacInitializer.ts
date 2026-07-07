// import { AppDataSource } from './database';
// import { User } from '../entities/User';
// import { PermissionModule } from '../entities/PermissionModule';
// import { Permission } from '../entities/Permission';
// import { Role } from '../entities/Role';
// import { RolePermission } from '../entities/RolePermission';
// import { AccountType } from '../types/enums';
// import { SYSTEM_MODULES, SYSTEM_PERMISSIONS, MODULES } from '../authorization/registry/modules';
// import { logger } from './logger';

// export async function initializeRBAC(): Promise<void> {
//   logger.info('🌱 Starting Startup RBAC Synchronization...');

//   const queryRunner = AppDataSource.createQueryRunner();
//   await queryRunner.connect();
//   await queryRunner.startTransaction();

//   try {
//     const moduleRepo = queryRunner.manager.getRepository(PermissionModule);
//     const permRepo = queryRunner.manager.getRepository(Permission);
//     const roleRepo = queryRunner.manager.getRepository(Role);
//     const rolePermRepo = queryRunner.manager.getRepository(RolePermission);
//     const userRepo = queryRunner.manager.getRepository(User);

//     // ─── Step 1: Sync Permission Modules ──────────────────────────────────────────
//     const activeModuleSlugs = SYSTEM_MODULES.map(m => m.slug);

//     // Soft-delete modules removed from registry
//     await moduleRepo.createQueryBuilder()
//       .softDelete()
//       .where('slug NOT IN (:...slugs)', { slugs: activeModuleSlugs })
//       .andWhere('isSystemModule = false')
//       .execute();

//     // Upsert modules from registry
//     for (const m of SYSTEM_MODULES) {
//       await moduleRepo.upsert({
//         name: m.name,
//         slug: m.slug,
//         icon: m.icon,
//         displayOrder: m.displayOrder,
//         isSystemModule: m.isSystem ?? false,
//         deletedAt: null
//       }, ['slug']);
//     }
//     logger.info('✓ Permission modules synced.');

//     // ─── Step 2: Sync Permissions ─────────────────────────────────────────────────
//     const activeKeys = SYSTEM_PERMISSIONS.map(p => p.key);

//     // Soft-delete permissions removed from registry
//     await permRepo.createQueryBuilder()
//       .softDelete()
//       .where('key NOT IN (:...keys)', { keys: activeKeys })
//       .execute();

//     // Build a moduleSlug lookup from the nested structure
//     const permissionModuleSlugMap = new Map<string, string>();
//     for (const module of MODULES) {
//       for (const perm of module.permissions) {
//         permissionModuleSlugMap.set(perm.key, module.slug);
//       }
//     }

//     // Upsert permissions from registry
//     for (const p of SYSTEM_PERMISSIONS) {
//       const moduleSlug = permissionModuleSlugMap.get(p.key);
//       if (!moduleSlug) {
//         logger.warn(`Could not find module for permission ${p.key}`);
//         continue;
//       }
//       const mod = await moduleRepo.findOne({ where: { slug: moduleSlug } });
//       if (!mod) {
//         logger.warn(`Could not find module ${moduleSlug} for permission ${p.key}`);
//         continue;
//       }

//       await permRepo.upsert({
//         moduleId: mod.id,
//         name: p.name,
//         // slug: p.key.replace(/\./g, '-'),
//         key: p.key,
//         action: p.action,
//         description: p.description,
//         deletedAt: null
//       }, ['key']);
//     }
//     logger.info('✓ Granular permissions synced.');

//     // ─── Step 3: Validate Permission Integrity ─────────────────────────────────────
//     const allPerms = await permRepo.find();
//     const orphanedPerms = allPerms.filter(p => !p.moduleId);
//     if (orphanedPerms.length > 0) {
//       throw new Error(`Integrity Check Failed: Found ${orphanedPerms.length} permissions missing valid module links.`);
//     }

//     // ─── Step 4: Synchronize System Roles ──────────────────────────────────────────
//     let superAdminRole = await roleRepo.findOne({ where: { slug: 'super-admin' } });
//     if (!superAdminRole) {
//       superAdminRole = roleRepo.create({
//         name: 'Super Admin',
//         slug: 'super-admin',
//         description: 'System Super Administrator. Has all system permissions by default.',
//         isSystemRole: true,
//         isActive: true,
//         version: 1,
//         priority: 100,
//       });
//       superAdminRole = await roleRepo.save(superAdminRole);
//     }
//     logger.info('✓ Super Admin role verified.');

//     // ─── Step 5: Ensure Super Admin Role contains ALL permissions ──────────────────
//     const existingRolePerms = await rolePermRepo.find({ where: { roleId: superAdminRole.id } });
//     const existingPermIds = new Set(existingRolePerms.map((rp) => rp.permissionId));

//     const rolePermsToCreate = allPerms
//       .filter((p) => !existingPermIds.has(p.id))
//       .map((p) =>
//         rolePermRepo.create({
//           roleId: superAdminRole!.id,
//           permissionId: p.id,
//         })
//       );

//     if (rolePermsToCreate.length > 0) {
//       await rolePermRepo.save(rolePermsToCreate);
//       logger.info(`✓ Assigned ${rolePermsToCreate.length} new permissions to Super Admin role.`);
//     }

//     await queryRunner.commitTransaction();
//     logger.info('🚀 System RBAC synchronization complete.');

//     // ─── Step 6: Check if Admin User exists for Setup Wizard status ──────────────────
//     const adminCount = await userRepo.count({
//       where: { accountType: AccountType.ADMIN }
//     });

//     if (adminCount === 0) {
//       logger.warn('⚠️ [Setup Wizard] No administrator accounts found. One-time Setup Wizard is ACTIVE at /setup.');
//     } else {
//       logger.info(`✓ [Setup Wizard] ${adminCount} administrator account(s) detected. Setup Wizard is disabled.`);
//     }

//   } catch (error) {
//     await queryRunner.rollbackTransaction();
//     logger.error({ error }, '❌ RBAC synchronization failed on startup');
//     throw error;
//   } finally {
//     await queryRunner.release();
//   }
// }
