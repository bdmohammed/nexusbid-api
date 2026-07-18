import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { setUserId } from '../config/requestContext';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../core/AppError';
import { JWT_COOKIE_NAME } from '../core/constants';
import { User } from '../database/entities/User';

import type { JwtPayload } from '../types/express';
import type { NextFunction, Request, Response } from 'express';

const userRepository = AppDataSource.getRepository(User);

function getRequestId(req: Request): string {
  return (req.id ?? (req.headers['x-request-id'] as string)) || uuidv4();
}

function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new AppError(
        AppErrorMessage.ACCESS_TOKEN_EXPIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.TOKEN_EXPIRED,
      );
    }
    throw new AppError(
      AppErrorMessage.SESSION_EXPIRED_OR_INVALID,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_TOKEN,
    );
  }
}

function validateUserAccount(user: User | null, decodedTokenVersion: number): asserts user is User {
  if (!user) {
    throw new AppError(
      AppErrorMessage.ACCOUNT_NOT_FOUND,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.ACCOUNT_NOT_FOUND,
    );
  }

  if (user.isBlocked) {
    throw new AppError(
      AppErrorMessage.ACCOUNT_SUSPENDED,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_BLOCKED,
    );
  }

  if (user.tokenVersion !== decodedTokenVersion) {
    throw new AppError(
      AppErrorMessage.SESSION_HAS_BEEN_REVOKED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.SESSION_REVOKED,
    );
  }
}

function validatePasswordStatus(
  user: { mustResetPassword?: boolean; passwordChangedAt?: Date | null; createdAt: Date },
  path: string,
): void {
  const bypassForcedReset = ['/api/v1/auth/logout', '/api/v1/auth/password/change'];
  if (user.mustResetPassword && !bypassForcedReset.some((route) => path.startsWith(route))) {
    throw new AppError(
      AppErrorMessage.PASSWORD_RESET_REQUIRED,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.FORCED_PASSWORD_RESET,
    );
  }

  const lastChanged = user.passwordChangedAt ?? user.createdAt;
  const daysSinceChange = (Date.now() - lastChanged.getTime()) / (24 * 60 * 60 * 1000);
  const bypassExpiration = ['/api/v1/auth/logout', '/api/v1/auth/password/change'];
  if (daysSinceChange > 90 && !bypassExpiration.some((route) => path.startsWith(route))) {
    throw new AppError(
      AppErrorMessage.PASSWORD_EXPIRED,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.PASSWORD_EXPIRED,
    );
  }
}

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
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  req.requestId = getRequestId(req);
  const token = req.cookies[JWT_COOKIE_NAME] as string | undefined;

  if (!token) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  let decodedTokenPayload: JwtPayload;
  try {
    decodedTokenPayload = verifyToken(token);
  } catch (err: unknown) {
    return next(err);
  }

  try {
    const user = await userRepository.findOne({
      where: { id: decodedTokenPayload.sub },
      select: [
        'id',
        'tokenVersion',
        'isBlocked',
        'emailVerified',
        'mustResetPassword',
        'passwordChangedAt',
        'createdAt',
      ],
    });

    validateUserAccount(user, decodedTokenPayload.tokenVersion);

    const path = req.originalUrl.split('?')[0] ?? '';
    validatePasswordStatus(user, path);
  } catch (err: unknown) {
    return next(err);
  }

  req.user = {
    sub: decodedTokenPayload.sub,
    userId: decodedTokenPayload.sub,
    email: decodedTokenPayload.email,
    accountType: decodedTokenPayload.accountType,
    role: decodedTokenPayload.accountType,
    adminRole: null,
    tokenVersion: decodedTokenPayload.tokenVersion,
  };
  setUserId(decodedTokenPayload.sub);
  req.log = req.log.child({ userId: decodedTokenPayload.sub });
  next();
};

/**
 * Same as authenticate but does NOT throw — attaches req.user if token is valid.
 * Used on public routes that show extra data to logged-in users (e.g., tender list).
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  req.requestId = getRequestId(req);
  const token = req.cookies[JWT_COOKIE_NAME] as string | undefined;
  if (!token) return next();

  try {
    const decodedTokenPayload = verifyToken(token);
    const user = await userRepository.findOne({
      where: { id: decodedTokenPayload.sub },
      select: ['id', 'tokenVersion', 'isBlocked'],
    });
    if (user && !user.isBlocked && user.tokenVersion === decodedTokenPayload.tokenVersion) {
      req.user = {
        sub: decodedTokenPayload.sub,
        userId: decodedTokenPayload.sub,
        email: decodedTokenPayload.email,
        accountType: decodedTokenPayload.accountType,
        role: decodedTokenPayload.accountType,
        adminRole: null,
        tokenVersion: decodedTokenPayload.tokenVersion,
      };
      setUserId(decodedTokenPayload.sub);
      req.log = req.log.child({ userId: decodedTokenPayload.sub });
    }
  } catch {
    // Token invalid — treat as unauthenticated, continue
  }
  next();
};
