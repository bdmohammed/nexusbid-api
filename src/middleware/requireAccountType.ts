import { AppError } from '../core/AppError';

import type { AccountType } from '../types/enums';
import type { NextFunction, Request, Response } from 'express';

export const requireAccountType = (allowedType: AccountType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    }

    if (req.user.accountType !== allowedType) {
      req.log.warn(
        { allowedType, userAccountType: req.user.accountType },
        'Forbidden: Access Denied',
      );
      return next(new AppError('Forbidden: Access Denied', 403, 'FORBIDDEN'));
    }

    next();
  };
};

export const requireRole = requireAccountType;
