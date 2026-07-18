import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../core/AppError';

import type { AccountType } from '../types/enums';
import type { NextFunction, Request, Response } from 'express';

export const requireAccountType = (allowedType: AccountType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError(
          AppErrorMessage.AUTHENTICATION_REQUIRED,
          HttpStatusCode.UNAUTHORIZED,
          AppErrorCode.UNAUTHENTICATED,
        ),
      );
    }

    if (req.user.accountType !== allowedType) {
      req.log.warn(
        { allowedType, userAccountType: req.user.accountType },
        'Forbidden: Access Denied',
      );
      return next(
        new AppError(
          AppErrorMessage.FORBIDDEN_ACCESS_DENIED,
          HttpStatusCode.FORBIDDEN,
          AppErrorCode.FORBIDDEN,
        ),
      );
    }

    next();
  };
};

export const requireRole = requireAccountType;
