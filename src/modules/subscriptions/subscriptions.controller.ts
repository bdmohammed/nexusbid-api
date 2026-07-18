import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { asyncHandler } from '../../core/asyncHandler';
import { sendCreated, sendOk } from '../../core/response';

import * as service from './subscriptions.service';

import type { JwtPayload } from '../../types/express';
import type { CreateSubscriptionDto } from './subscriptions.dto';

export const getPlans = asyncHandler(async (_req, res) => {
  const plans = await service.listPlans();
  return sendOk(res, plans);
});

export const createSubscription = asyncHandler<{}, object, CreateSubscriptionDto>(
  async (req, res) => {
    const { userId, email } = req.user as JwtPayload;
    if (!userId || !email) {
      throw new AppError(
        AppErrorMessage.USER_NOT_LOGGED_IN,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHORIZED,
      );
    }
    const result = await service.createSubscription(req.body, {
      userId,
      name: 'User',
      email,
    });
    return sendCreated(res, result, 'Subscription initiated. Complete payment on PayPal.');
  },
);

export const getMySubscription = asyncHandler(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  const result = await service.getMySubscription(userId);
  return sendOk(res, result);
});

export const cancelMySubscription = asyncHandler(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  await service.cancelMySubscription(userId);
  return sendOk(
    res,
    null,
    'Subscription cancelled. Access remains until the end of the billing period.',
  );
});
