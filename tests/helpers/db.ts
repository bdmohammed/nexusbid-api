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
import { appDataSource } from '../../src/config/database';
import { Role } from '../../src/entities/Role';
import { UserRole } from '../../src/entities/UserRole';
import { Permission } from '../../src/entities/Permission';
import { PermissionModule } from '../../src/entities/PermissionModule';
import { RolePermission } from '../../src/entities/RolePermission';

/**
 * Truncates all auth-related tables and resets identity sequences.
 * Call in beforeEach() inside test suites that write to these tables.
 */
export async function clearAuthTables(): Promise<void> {
  await appDataSource.query(`
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
      role_permissions,
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
  const queryRunner = appDataSource.createQueryRunner();
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
  const roleRepo = appDataSource.getRepository(Role);
  const userRoleRepo = appDataSource.getRepository(UserRole);
  const permissionRepo = appDataSource.getRepository(Permission);
  const moduleRepo = appDataSource.getRepository(PermissionModule);
  const rolePermissionRepo = appDataSource.getRepository(RolePermission);

  const [modulePart] = permissionKey.split('.');
  let module = await moduleRepo.findOneBy({ name: modulePart });
  if (!module) {
    module = moduleRepo.create({ name: modulePart, description: `Test Module ${modulePart}` });
    await moduleRepo.save(module);
  }

  let permission = await permissionRepo.findOneBy({ key: permissionKey });
  if (!permission) {
    permission = permissionRepo.create({
      name: permissionKey,
      key: permissionKey,
      description: `Test Permission ${permissionKey}`,
      moduleId: module.id,
    });
    await permissionRepo.save(permission);
  }

  const slug = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let role = await roleRepo.findOneBy({ slug });
  if (!role) {
    role = roleRepo.create({
      name: roleName,
      slug,
      description: `Test Role ${roleName}`,
      isActive: true,
      isSystemRole: slug === 'super-admin',
    });
    await roleRepo.save(role);
  }

  let rolePermission = await rolePermissionRepo.findOneBy({
    roleId: role.id,
    permissionId: permission.id,
  });
  if (!rolePermission) {
    rolePermission = rolePermissionRepo.create({
      roleId: role.id,
      permissionId: permission.id,
    });
    await rolePermissionRepo.save(rolePermission);
  }

  let userRole = await userRoleRepo.findOneBy({
    userId,
    roleId: role.id,
  });
  if (!userRole) {
    userRole = userRoleRepo.create({
      userId,
      roleId: role.id,
    });
    await userRoleRepo.save(userRole);
  }
}
