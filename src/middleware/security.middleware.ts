import { appDataSource } from '../config/database';
import { AppError } from '../core/AppError';
import { User } from '../entities/User';

import type { NextFunction, Request, Response } from 'express';

const userRepo = appDataSource.getRepository(User);

/**
 * Intercepts requests for users who are marked for a forced password reset.
 * Only allows calls to logout, reset-password, and password change endpoints.
 */
export const checkForcedReset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    return next();
  }

  const bypassRoutes = [
    '/api/v1/auth/logout',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/password/change',
  ];

  const path = req.originalUrl.split('?')[0] ?? '';
  if (bypassRoutes.some((route) => path.startsWith(route))) {
    return next();
  }

  const user = await userRepo.findOne({
    where: { id: req.user.userId },
    select: ['mustResetPassword'],
  });

  if (user?.mustResetPassword) {
    return next(
      new AppError('You must reset your password before continuing.', 403, 'FORCED_PASSWORD_RESET'),
    );
  }

  next();
};

/**
 * Intercepts requests for users whose passwords are older than 90 days.
 * Only allows calls to logout and password change endpoints.
 */
export const checkPasswordExpiration = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    return next();
  }

  const bypassRoutes = ['/api/v1/auth/logout', '/api/v1/auth/password/change'];

  const path = req.originalUrl.split('?')[0] ?? '';
  if (bypassRoutes.some((route) => path.startsWith(route))) {
    return next();
  }

  const user = await userRepo.findOne({
    where: { id: req.user.userId },
    select: ['passwordChangedAt', 'createdAt'],
  });

  if (user) {
    const lastChanged = user.passwordChangedAt ?? user.createdAt;
    const daysSinceChange = (Date.now() - lastChanged.getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceChange > 90) {
      return next(
        new AppError('Your password has expired and must be changed.', 403, 'PASSWORD_EXPIRED'),
      );
    }
  }

  next();
};
