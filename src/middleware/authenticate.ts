import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AppError } from '../core/AppError';
import { JWT_COOKIE_NAME } from '../core/constants';
import { env } from '../config/env';
import { setUserId } from '../config/requestContext';

const userRepo = AppDataSource.getRepository(User);

/**
 * Verifies the JWT stored in the HTTP-only cookie.
 * Attaches the decoded payload to req.user.
 *
 * Also checks tokenVersion against the DB to support instant session revocation:
 * - After password change
 * - After email change
 * - After account block
 * - When an admin revokes all sessions
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  req.requestId = (req as any).id || (req.headers['x-request-id'] as string) || uuidv4();
  const token = req.cookies?.[JWT_COOKIE_NAME] as string | undefined;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
  }

  let payload: any;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as any;
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Session expired or invalid', 401, 'INVALID_TOKEN'));
  }

  // Verify tokenVersion against DB to detect revoked sessions
  const user = await userRepo.findOne({
    where: { id: payload.sub },
    select: ['id', 'tokenVersion', 'isBlocked', 'emailVerified', 'mustResetPassword', 'passwordChangedAt', 'createdAt'],
  });

  if (!user) {
    return next(new AppError('Account not found', 401, 'ACCOUNT_NOT_FOUND'));
  }

  if (user.isBlocked) {
    return next(new AppError('Account suspended', 403, 'ACCOUNT_BLOCKED'));
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return next(new AppError('Session has been revoked', 401, 'SESSION_REVOKED'));
  }

  const path = req.originalUrl.split('?')[0] || '';

  // 1. Enforce Forced Password Reset
  const bypassForcedReset = [
    '/api/v1/auth/logout',
    '/api/v1/auth/password/change',
  ];
  if (user.mustResetPassword && !bypassForcedReset.some((route) => path.startsWith(route))) {
    return next(new AppError('You must reset your password before continuing.', 403, 'FORCED_PASSWORD_RESET'));
  }

  // 2. Enforce Password Expiration (90 Days)
  const lastChanged = user.passwordChangedAt || user.createdAt;
  const daysSinceChange = (Date.now() - lastChanged.getTime()) / (24 * 60 * 60 * 1000);
  const bypassExpiration = [
    '/api/v1/auth/logout',
    '/api/v1/auth/password/change',
  ];
  if (daysSinceChange > 90 && !bypassExpiration.some((route) => path.startsWith(route))) {
    return next(new AppError('Your password has expired and must be changed.', 403, 'PASSWORD_EXPIRED'));
  }

  req.user = {
    sub: payload.sub,
    userId: payload.sub,
    email: payload.email,
    accountType: payload.accountType,
    role: payload.accountType,
    adminRole: null,
    tokenVersion: payload.tokenVersion,
  };
  setUserId(payload.sub);
  if (req.log) {
    req.log = req.log.child({ userId: payload.sub });
  }
  next();
};

/**
 * Same as authenticate but does NOT throw — attaches req.user if token is valid.
 * Used on public routes that show extra data to logged-in users (e.g., tender list).
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  req.requestId = (req as any).id || (req.headers['x-request-id'] as string) || uuidv4();
  const token = req.cookies?.[JWT_COOKIE_NAME] as string | undefined;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    const user = await userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'tokenVersion', 'isBlocked'],
    });
    if (user && !user.isBlocked && user.tokenVersion === payload.tokenVersion) {
      req.user = {
        sub: payload.sub,
        userId: payload.sub,
        email: payload.email,
        accountType: payload.accountType,
        role: payload.accountType,
        adminRole: null,
        tokenVersion: payload.tokenVersion,
      };
      setUserId(payload.sub);
      if (req.log) {
        req.log = req.log.child({ userId: payload.sub });
      }
    }
  } catch {
    // Token invalid — treat as unauthenticated, continue
  }
  next();
};
