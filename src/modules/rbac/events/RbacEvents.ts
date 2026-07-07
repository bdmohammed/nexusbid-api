import { EventEmitter } from 'events';
import { AppDataSource } from '../../../config/database';
import { AuditLog } from '../../../entities/AuditLog';
import { User } from '../../../entities/User';
import { UserRole } from '../../../entities/UserRole';
import { RoleVersionPermission } from '../../../entities/RoleVersionPermission';
import { Permission } from '../../../entities/Permission';
import { CacheService } from '../../../services/cache.service';
import { In } from 'typeorm';
import { logger } from '../../../config/logger';

export class RbacEventEmitter extends EventEmitter {}
export const rbacEventEmitter = new RbacEventEmitter();

// Event interfaces
interface RoleEventPayload {
  roleId: string;
  roleName: string;
  version?: number;
  userId: string; // Actor
  ip?: string;
  userAgent?: string;
}

interface RoleUpdatePayload extends RoleEventPayload {
  before?: Record<string, any>;
  after?: Record<string, any>;
}

interface RoleAssignPayload {
  roleId: string;
  roleName: string;
  targetUserId: string;
  userId: string; // Actor
  ip?: string;
  userAgent?: string;
}

// ─── Helper: Create Audit Log ───────────────────────────────────────────────
async function createAuditLog(
  action: string,
  entityId: string,
  actorId: string,
  before: Record<string, any> | null,
  after: Record<string, any> | null,
  ip?: string,
  userAgent?: string,
) {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const actor = await userRepo.findOne({ where: { id: actorId }, select: ['email'] });
    const actorEmail = actor?.email || 'system';

    const auditLogRepo = AppDataSource.getRepository(AuditLog);
    const log = auditLogRepo.create({
      actorId,
      actorEmail,
      action,
      entityType: 'role',
      entityId,
      before,
      after,
      ipAddress: ip || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
    });
    await auditLogRepo.save(log);
  } catch (err) {
    logger.error({ err, action, entityId }, 'Failed to write RBAC audit log');
  }
}



// ─── Helper: Rebuild User Permissions Cache ───────────────────────────────
async function rebuildUserPermissionsCache(userId: string) {
  try {
    const cacheKey = `permissions:${userId}`;
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    
    const userRoles = await userRoleRepo.find({
      where: { userId },
      relations: ['role'],
    });

    const activeUserRoles = userRoles.filter((ur) => {
      if (!ur.role || ur.role.status !== 'ACTIVE') return false;
      if (ur.expiresAt && ur.expiresAt.getTime() < Date.now()) return false;
      return true;
    });

    const roleSlugs = activeUserRoles.map((ur) => ur.role.slug);
    let permissionKeys: string[] = [];

    const hasSuperAdmin = activeUserRoles.some((ur) => ur.role.isSystemRole || ur.role.slug === 'super-admin');

    if (hasSuperAdmin) {
      const permissionRepo = AppDataSource.getRepository(Permission);
      const allPermissions = await permissionRepo.find({ select: ['key'] });
      permissionKeys = allPermissions.map((p) => p.key);
    } else if (activeUserRoles.length > 0) {
      const activeVersionIds = activeUserRoles
        .map((ur) => ur.role.activeVersionId)
        .filter((id): id is string => !!id);

      if (activeVersionIds.length > 0) {
        const rvpRepo = AppDataSource.getRepository(RoleVersionPermission);
        const rvpList = await rvpRepo.find({
          where: { roleVersionId: In(activeVersionIds) },
          select: ['permissionKey'],
        });
        permissionKeys = Array.from(new Set(rvpList.map((p) => p.permissionKey)));
      }
    }

    await CacheService.set(cacheKey, { roles: roleSlugs, permissions: permissionKeys }, 300);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to rebuild permissions cache for user');
  }
}

async function rebuildCacheForRoleUsers(roleId: string) {
  try {
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const assignments = await userRoleRepo.find({
      where: { roleId },
      select: ['userId'],
    });
    for (const assignment of assignments) {
      await rebuildUserPermissionsCache(assignment.userId);
    }
  } catch (err) {
    logger.error({ err, roleId }, 'Failed to rebuild cache for role users');
  }
}

// ─── Event Subscribers ──────────────────────────────────────────────────────

// 1. RoleCreated
rbacEventEmitter.on('RoleCreated', async (payload: RoleEventPayload) => {
  logger.info(payload, 'Event: RoleCreated');
  await createAuditLog('role.create', payload.roleId, payload.userId, null, { roleName: payload.roleName, version: payload.version }, payload.ip, payload.userAgent);
});

// 2. RoleUpdated
rbacEventEmitter.on('RoleUpdated', async (payload: RoleUpdatePayload) => {
  logger.info(payload, 'Event: RoleUpdated');
  await createAuditLog('role.update', payload.roleId, payload.userId, payload.before || null, payload.after || null, payload.ip, payload.userAgent);
  await rebuildCacheForRoleUsers(payload.roleId);
});

// 3. RoleSubmitted
rbacEventEmitter.on('RoleSubmitted', async (payload: RoleEventPayload) => {
  logger.info(payload, 'Event: RoleSubmitted');
  await createAuditLog('role.submit', payload.roleId, payload.userId, null, { version: payload.version }, payload.ip, payload.userAgent);
});

// 4. RoleApproved
rbacEventEmitter.on('RoleApproved', async (payload: RoleEventPayload) => {
  logger.info(payload, 'Event: RoleApproved');
  await createAuditLog('role.approve', payload.roleId, payload.userId, null, { version: payload.version }, payload.ip, payload.userAgent);
  await rebuildCacheForRoleUsers(payload.roleId);
});

// 5. RoleRejected
rbacEventEmitter.on('RoleRejected', async (payload: RoleUpdatePayload) => {
  logger.info(payload, 'Event: RoleRejected');
  await createAuditLog('role.reject', payload.roleId, payload.userId, null, { version: payload.version, comment: payload.after?.comment }, payload.ip, payload.userAgent);
});

// 6. RoleReopened
rbacEventEmitter.on('RoleReopened', async (payload: RoleEventPayload) => {
  logger.info(payload, 'Event: RoleReopened');
  await createAuditLog('role.reopen', payload.roleId, payload.userId, null, { version: payload.version }, payload.ip, payload.userAgent);
});

// 7. RoleArchived
rbacEventEmitter.on('RoleArchived', async (payload: RoleEventPayload) => {
  logger.info(payload, 'Event: RoleArchived');
  await createAuditLog('role.archive', payload.roleId, payload.userId, null, null, payload.ip, payload.userAgent);
  await rebuildCacheForRoleUsers(payload.roleId);
});

// 8. RoleAssigned
rbacEventEmitter.on('RoleAssigned', async (payload: RoleAssignPayload) => {
  logger.info(payload, 'Event: RoleAssigned');
  await createAuditLog('role.assign', payload.roleId, payload.userId, null, { targetUserId: payload.targetUserId }, payload.ip, payload.userAgent);
  await rebuildUserPermissionsCache(payload.targetUserId);
});
