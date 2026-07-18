/**
 * tests/helpers/db.ts
 *
 * Database helpers for test isolation.
 *
 * clearAuthTables()
 * -----------------
 * Truncates the auth-related tables in dependency order using CASCADE.
 *
 * Why TRUNCATE ... RESTART IDENTITY CASCADE?
 *   - Plain TRUNCATE users throws a FK-constraint error because other tables
 *     (email_tokens, audit_logs, subscriptions, etc.) have FK references
 *     pointing at users, even when those tables are empty. PostgreSQL checks
 *     the *defined* constraint, not just existing rows.
 *   - CASCADE propagates the truncation to all referencing tables, so a
 *     single statement clears the entire dependency graph.
 *   - RESTART IDENTITY resets all SERIAL/BIGSERIAL sequences so auto-generated
 *     IDs are predictable and repeatable across test runs.
 *
 * withTransaction()
 * -----------------
 * Wraps a test body in a transaction that is always rolled back.
 * Use for tests that only need read isolation (no TRUNCATE overhead).
 */
import { AppDataSource } from '../../src/config/database';
import { Role } from '../../src/database/entities/Role';
import { UserRole } from '../../src/database/entities/UserRole';
import { Permission } from '../../src/database/entities/Permission';
import { PermissionModule } from '../../src/database/entities/PermissionModule';
import { RoleVersion } from '../../src/database/entities/RoleVersion';
import { RoleVersionPermission } from '../../src/database/entities/RoleVersionPermission';
import { RoleStatus, RoleVersionStatus } from '../../src/types/enums';

/**
 * Truncates all auth-related tables and resets identity sequences.
 * Call in beforeEach() inside test suites that write to these tables.
 */
export async function clearAuthTables(): Promise<void> {
  await AppDataSource.query(`
    TRUNCATE TABLE
      audit_logs,
      email_tokens,
      user_sessions,
      alert_preferences,
      notifications,
      download_histories,
      saved_tenders,
      purchased_tenders,
      subscriptions,
      transactions,
      user_roles,
      role_version_permissions,
      role_reviews,
      role_versions,
      roles,
      permissions,
      permission_modules,
      support_tickets,
      password_histories,
      user_devices,
      security_logs,
      users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Wraps a test in a DB transaction that is always rolled back.
 * Provides isolation without truncation -- useful for read-only tests
 * or when you want to inspect intermediate state without side effects.
 *
 * Usage:
 *   it('should do X', () => withTransaction(async () => {
 *     // test body
 *   }));
 */
export async function withTransaction(fn: () => Promise<void>): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await fn();
  } finally {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
}

/**
 * Seeds a permission and role, and assigns it to a user for integration tests.
 */
export async function setupTestRoleWithPermission(
  userId: string,
  roleName: string,
  permissionKey: string,
): Promise<void> {
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const permissionRepo = AppDataSource.getRepository(Permission);
  const moduleRepo = AppDataSource.getRepository(PermissionModule);
  const versionRepo = AppDataSource.getRepository(RoleVersion);
  const rvpRepo = AppDataSource.getRepository(RoleVersionPermission);

  const [modulePart] = permissionKey.split('.');
  let module = await moduleRepo.findOneBy({ key: modulePart.toLowerCase() });
  if (!module) {
    module = moduleRepo.create({
      name: modulePart,
      key: modulePart.toLowerCase(),
      description: `Test Module ${modulePart}`,
      isActive: true,
      createdById: userId,
    });
    await moduleRepo.save(module);
  }

  let permission = await permissionRepo.findOneBy({ key: permissionKey });
  if (!permission) {
    const [, action] = permissionKey.split('.');
    permission = permissionRepo.create({
      name: permissionKey,
      key: permissionKey,
      action: action || 'READ',
      description: `Test Permission ${permissionKey}`,
      moduleId: module.id,
      isActive: true,
      createdById: userId,
    });
    await permissionRepo.save(permission);
  }

  const isSuperAdmin = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === 'super-admin';
  
  let roleVersion = await versionRepo.findOne({
    where: { name: roleName },
    relations: ['role'],
  });

  let role: Role;
  if (!roleVersion) {
    role = roleRepo.create({
      status: RoleStatus.ACTIVE,
      isSystemRole: isSuperAdmin,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    await roleRepo.save(role);

    roleVersion = versionRepo.create({
      roleId: role.id,
      version: 1,
      name: roleName,
      description: `Test Role ${roleName}`,
      status: RoleVersionStatus.APPROVED,
      createdByUserId: userId,
      approvedByUserId: userId,
      approvedAt: new Date(),
    });
    await versionRepo.save(roleVersion);

    role.activeVersionId = roleVersion.id;
    await roleRepo.save(role);
  } else {
    role = roleVersion.role;
  }

  let rvp = await rvpRepo.findOneBy({
    roleVersionId: roleVersion.id,
    permissionKey,
  });
  if (!rvp) {
    rvp = rvpRepo.create({
      roleVersionId: roleVersion.id,
      permissionKey,
      permissionName: permission.name,
      moduleSlug: module.key,
      moduleName: module.name,
    });
    await rvpRepo.save(rvp);
  }

  let userRole = await userRoleRepo.findOneBy({
    userId,
    roleId: role.id,
  });
  if (!userRole) {
    userRole = userRoleRepo.create({
      userId,
      roleId: role.id,
      assignedAt: new Date(),
    });
    await userRoleRepo.save(userRole);
  }
}
