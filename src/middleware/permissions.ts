import slugify from 'slugify';
import { In } from 'typeorm';

import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../core/AppError';
import { Permission } from '../database/entities/Permission';
import { RoleVersionPermission } from '../database/entities/RoleVersionPermission';
import { UserRole } from '../database/entities/UserRole';
import { CacheService } from '../services/cache.service';
import { AccountType, RoleStatus } from '../types/enums';

import type { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '@/config/database';

export const loadPermissions = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  if (req.user.accountType !== AccountType.ADMIN) {
    req.roles = [];
    req.permissions = [];
    return next();
  }

  const { userId } = req.user;
  const cacheKey = `permissions:${userId}`;

  try {
    const cached = await CacheService.get<{ roles: string[]; permissions: string[] }>(cacheKey);
    if (cached) {
      req.roles = cached.roles;
      req.permissions = cached.permissions;
      return next();
    }

    // Cache miss - resolve from DB
    const userRoleRepo = AppDataSource.getRepository(UserRole);

    // Find all active, non-expired role assignments for user
    const userRoles = await userRoleRepo.find({
      where: { userId },
      relations: ['role', 'role.activeVersion'],
    });

    const activeUserRoles = userRoles.filter((ur) => {
      if (ur.role.status !== RoleStatus.ACTIVE) return false;
      if (ur.expiresAt && ur.expiresAt.getTime() < Date.now()) return false;
      return true;
    });

    const roleSlugs = activeUserRoles
      .map((ur) => {
        if (ur.role.isSystemRole) return 'super-admin';
        return ur.role.activeVersion?.name
          ? slugify(ur.role.activeVersion.name, { lower: true, strict: true })
          : '';
      })
      .filter(Boolean);
    let permissionKeys: string[] = [];

    // If user has Super Admin role, they get ALL permissions
    const hasSuperAdmin = activeUserRoles.some((ur) => ur.role.isSystemRole);

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

    req.roles = roleSlugs;
    req.permissions = permissionKeys;

    // Cache the resolved roles and permissions
    await CacheService.set(cacheKey, { roles: roleSlugs, permissions: permissionKeys }, 300);

    next();
  } catch {
    // Fail closed: return 500 error response to prevent any unauthorized bypass
    return next(
      new AppError(
        AppErrorMessage.PERMISSIONS_LOAD_FAILED,
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        AppErrorCode.PERMISSION_LOAD_FAILED,
      ),
    );
  }
};

export const requirePermission = (permissionKey: string) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      // Super Admin bypasses all checks
      if (req.roles?.includes('super-admin')) {
        return next();
      }

      if (!req.permissions?.includes(permissionKey)) {
        req.log.warn({ requiredPermission: permissionKey }, 'Forbidden: Insufficient Permissions');
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

export const requireAnyPermission = (permissionKeys: string[]) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (req.roles?.includes('super-admin')) {
        return next();
      }

      const hasAny = permissionKeys.some((key) => req.permissions?.includes(key));
      if (!hasAny) {
        req.log.warn(
          { requiredAnyPermission: permissionKeys },
          'Forbidden: Insufficient Permissions',
        );
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

export const requireAllPermissions = (permissionKeys: string[]) => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (req.roles?.includes('super-admin')) {
        return next();
      }

      const hasAll = permissionKeys.every((key) => req.permissions?.includes(key));
      if (!hasAll) {
        req.log.warn(
          { requiredAllPermissions: permissionKeys },
          'Forbidden: Insufficient Permissions',
        );
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};

export const requireSuperAdmin = () => {
  return [
    loadPermissions,
    (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.roles?.includes('super-admin')) {
        req.log.warn({ requiredRole: 'super-admin' }, 'Forbidden: Super Admin Access Required');
        return next(
          new AppError(
            AppErrorMessage.FORBIDDEN_SUPER_ADMIN_REQUIRED,
            HttpStatusCode.FORBIDDEN,
            AppErrorCode.FORBIDDEN,
          ),
        );
      }
      next();
    },
  ];
};
