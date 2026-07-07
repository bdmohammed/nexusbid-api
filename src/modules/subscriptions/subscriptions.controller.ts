import { Request, Response } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { sendOk, sendCreated } from '../../core/response';
import * as service from './subscriptions.service';
import type { CreateSubscriptionDto } from './subscriptions.dto';

export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await service.listPlans();
  return sendOk(res, plans);
});

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateSubscriptionDto;
  const result = await service.createSubscription(dto, {
    userId: req.user!.userId,
    name: 'User', // will be enriched from user record in service if needed
    email: req.user!.email,
  });
  return sendCreated(res, result, 'Subscription initiated. Complete payment on PayPal.');
});

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getMySubscription(req.user!.userId);
  return sendOk(res, result);
});

export const cancelMySubscription = asyncHandler(async (req: Request, res: Response) => {
  await service.cancelMySubscription(req.user!.userId);
  return sendOk(res, null, 'Subscription cancelled. Access remains until the end of the billing period.');
});
