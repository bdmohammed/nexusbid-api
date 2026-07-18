import { performance } from 'node:perf_hooks';

import { AppDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { Coupon } from '../../database/entities/Coupon';
import { Plan } from '../../database/entities/Plan';
import { Subscription } from '../../database/entities/Subscription';
import { cancelSubscription as paypalCancelSubscription } from '../../services/paypal/paypal.subscriptions';
import { CouponDiscountType, PlanStatus, SubscriptionStatus } from '../../types/enums';

import type { CreateSubscriptionDto } from './subscriptions.dto';

const planRepository = AppDataSource.getRepository(Plan);
const subscriptionRepository = AppDataSource.getRepository(Subscription);
const couponRepository = AppDataSource.getRepository(Coupon);

// ─── List active plans ────────────────────────────────────────────────────────

export async function listPlans(): Promise<Plan[]> {
  return planRepository.find({
    where: { status: PlanStatus.ACTIVE },
    relations: [
      'activeVersion',
      'activeVersion.features',
      'activeVersion.countryPricing',
      'activeVersion.categoryPricing',
    ],
  });
}

// ─── Create subscription ──────────────────────────────────────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function createSubscription(
  dto: CreateSubscriptionDto,
  user: { userId: string; name: string; email: string; country?: string | null },
): Promise<{ approvalUrl: string; subscriptionId: string }> {
  const start = performance.now();

  // Verify plan exists and is active
  const plan = await planRepository.findOne({
    where: { id: dto.planId, status: PlanStatus.ACTIVE },
    relations: [
      'activeVersion',
      'activeVersion.countryPricing',
      'activeVersion.countryPricing.country',
      'activeVersion.categoryPricing',
    ],
  });
  if (!plan?.activeVersionId || !plan.activeVersion) {
    throw new AppError(
      AppErrorMessage.PLAN_NOT_FOUND_OR_INACTIVE,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const activeVer = plan.activeVersion;

  // Enforce targeting and bundle constraints
  if (activeVer.planType === 'state' && !dto.targetStateId) {
    throw new AppError(
      AppErrorMessage.STATE_SELECTION_REQUIRED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.STATE_REQUIRED,
    );
  }
  if (activeVer.planType === 'country' && !dto.targetCountry) {
    throw new AppError(
      AppErrorMessage.COUNTRY_SELECTION_REQUIRED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.COUNTRY_REQUIRED,
    );
  }
  if (activeVer.planType === 'category' && !dto.targetCategoryId) {
    throw new AppError(
      AppErrorMessage.CATEGORY_SELECTION_REQUIRED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.CATEGORY_REQUIRED,
    );
  }
  if (activeVer.planType === 'bundle') {
    if (!dto.selectedCategoryIds || dto.selectedCategoryIds.length === 0) {
      throw new AppError(
        AppErrorMessage.CATEGORY_SELECTIONS_REQUIRED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CATEGORIES_REQUIRED,
      );
    }
    if (activeVer.bundleSize && dto.selectedCategoryIds.length > activeVer.bundleSize) {
      throw new AppError(
        AppErrorMessage.MAX_CATEGORIES_EXCEEDED(activeVer.bundleSize),
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.MAX_CATEGORIES_EXCEEDED,
      );
    }
  }

  // Check if user already has an active subscription for the SAME target or overall
  const existingSubscription = await subscriptionRepository.findOne({
    where: { userId: user.userId, status: SubscriptionStatus.ACTIVE },
  });
  if (existingSubscription) {
    if (existingSubscription.paypalSubscriptionId ?? existingSubscription.paypalOrderId) {
      throw new AppError(
        AppErrorMessage.SUBSCRIPTION_ALREADY_ACTIVE,
        HttpStatusCode.CONFLICT,
        AppErrorCode.ALREADY_SUBSCRIBED,
      );
    }
  }

  let approvalUrl: string;
  let subscriptionId: string | null = null;
  let orderId: string | null = null;
  let finalPriceCents = activeVer.priceCents;

  // 1. Geographic Pricing Override
  if (user.country && activeVer.countryPricing.length) {
    const countryPricingMatch = activeVer.countryPricing.find(
      (countryPricingItem) =>
        countryPricingItem.country.code.toLowerCase() === user.country!.toLowerCase() ||
        countryPricingItem.country.name.toLowerCase() === user.country!.toLowerCase(),
    );
    if (countryPricingMatch) {
      finalPriceCents = countryPricingMatch.priceCents;
    }
  }

  // 2. Category Pricing Override
  if (
    activeVer.planType === 'category' &&
    dto.targetCategoryId &&
    activeVer.categoryPricing.length
  ) {
    const categoryPricingMatch = activeVer.categoryPricing.find(
      (categoryPricingItem) => categoryPricingItem.categoryId === dto.targetCategoryId,
    );
    if (categoryPricingMatch) {
      finalPriceCents = categoryPricingMatch.priceCents;
    }
  }

  // 3. Apply Coupon Discount (Coupon Code checking)
  let couponId: string | null = null;
  if (dto.couponCode) {
    const coupon = await couponRepository.findOne({
      where: { code: dto.couponCode, isActive: true },
      relations: ['restrictedPlans'],
    });
    if (!coupon)
      throw new AppError(
        AppErrorMessage.COUPON_NOT_FOUND_OR_INACTIVE,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.COUPON_NOT_FOUND,
      );

    if (coupon.validFrom && coupon.validFrom > new Date()) {
      throw new AppError(
        AppErrorMessage.COUPON_NOT_ACTIVE,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.COUPON_NOT_YET_ACTIVE,
      );
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(
        AppErrorMessage.COUPON_EXPIRED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.COUPON_EXPIRED,
      );
    }
    if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new AppError(
        AppErrorMessage.COUPON_LIMIT_REACHED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.COUPON_LIMIT_REACHED,
      );
    }
    if (coupon.minPurchaseCents !== null && finalPriceCents < coupon.minPurchaseCents) {
      throw new AppError(
        AppErrorMessage.COUPON_MIN_AMOUNT_NOT_MET,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.COUPON_MIN_PURCHASE_NOT_MET,
      );
    }
    if (coupon.firstPurchaseOnly) {
      const hasPriorSubscription = await subscriptionRepository.findOne({
        where: { userId: user.userId },
      });
      if (hasPriorSubscription) {
        throw new AppError(
          AppErrorMessage.COUPON_FIRST_PURCHASE_ONLY,
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.COUPON_FIRST_PURCHASE_ONLY,
        );
      }
    }
    if (coupon.maxRedemptionsPerUser !== null) {
      const userRedemptionCount = await subscriptionRepository.count({
        where: { userId: user.userId, couponId: coupon.id },
      });
      if (userRedemptionCount >= coupon.maxRedemptionsPerUser) {
        throw new AppError(
          AppErrorMessage.COUPON_USER_LIMIT_REACHED,
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.COUPON_USER_LIMIT_REACHED,
        );
      }
    }
    if (coupon.restrictedPlans.length) {
      const isEligible = coupon.restrictedPlans.some((p) => p.id === plan.id);
      if (!isEligible) {
        throw new AppError(
          AppErrorMessage.COUPON_INVALID_PLAN,
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.COUPON_PLAN_RESTRICTED,
        );
      }
    }

    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      let discount = Math.round(finalPriceCents * (coupon.discountValue / 100));
      if (coupon.maxDiscountCents !== null && discount > coupon.maxDiscountCents) {
        discount = coupon.maxDiscountCents;
      }
      finalPriceCents = Math.max(0, finalPriceCents - discount);
    } else if (coupon.discountType === CouponDiscountType.FIXED) {
      finalPriceCents = Math.max(0, finalPriceCents - coupon.discountValue);
    } else if (coupon.discountType === CouponDiscountType.FREE_MONTH) {
      finalPriceCents = 0;
    }

    couponId = coupon.id;
    coupon.redemptionCount += 1;
    await couponRepository.save(coupon);
  }

  if (activeVer.isRecurring && activeVer.badge !== 'Enterprise' && finalPriceCents > 0) {
    // Create subscription with PayPal Subscriptions API (v1)
    // Here we'd map to a PayPal plan. In mock/local, we simulate approval url.
    const mockPaypalSub = { id: `I-MOCK${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
    approvalUrl = `${dto.returnUrl}?subscription_id=${mockPaypalSub.id}`;
    subscriptionId = mockPaypalSub.id;
  } else {
    // Create one-time purchase with PayPal Orders API (v2)
    const mockOrder = { id: `ORD-MOCK${Math.random().toString(36).substr(2, 9).toUpperCase()}` };
    approvalUrl = `${dto.returnUrl}?token=${mockOrder.id}`;
    orderId = mockOrder.id;
  }

  // Calculate duration
  const startDate = new Date();
  const totalDays = activeVer.durationDays + activeVer.trialDays;
  const endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);

  const subscription = subscriptionRepository.create({
    userId: user.userId,
    planVersionId: activeVer.id,
    couponId,
    startDate,
    endDate,
    status: SubscriptionStatus.ACTIVE,
    paypalSubscriptionId: subscriptionId,
    paypalOrderId: orderId,
    targetStateId: dto.targetStateId ?? null,
    targetCountry: dto.targetCountry ?? null,
    targetCategoryId: dto.targetCategoryId ?? null,
    selectedCategoryIds: dto.selectedCategoryIds ?? null,
  });

  await subscriptionRepository.save(subscription);

  // Log audit info
  logger.info(
    { planId: dto.planId, versionId: activeVer.id, finalPriceCents },
    'Subscription created',
  );

  const durationMs = performance.now() - start;
  logger.info(
    { planId: dto.planId, userId: user.userId, durationMs },
    'Subscription creation completed',
  );

  return { approvalUrl, subscriptionId: (subscriptionId ?? orderId) as string };
}

// ─── Get current user's active subscription ───────────────────────────────────

export async function getMySubscription(userId: string): Promise<{
  subscription: Subscription | null;
  plan: Plan | null;
}> {
  const subscription = await subscriptionRepository.findOne({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['planVersion', 'planVersion.plan'],
    order: { createdAt: 'DESC' },
  });

  if (!subscription) return { subscription: null, plan: null };
  return { subscription, plan: subscription.planVersion.plan };
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelMySubscription(userId: string): Promise<void> {
  const start = performance.now();
  const subscription = await subscriptionRepository.findOne({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['planVersion', 'planVersion.plan'],
  });

  if (!subscription)
    throw new AppError(
      AppErrorMessage.NO_ACTIVE_SUBSCRIPTION,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  if (subscription.paypalSubscriptionId) {
    try {
      await paypalCancelSubscription(subscription.paypalSubscriptionId);
    } catch (error) {
      logger.warn({ error }, 'PayPal cancel failed, moving forward with local cancel');
    }
  }

  await subscriptionRepository.update(subscription.id, { status: SubscriptionStatus.CANCELLED });

  const durationMs = performance.now() - start;
  logger.info(
    { userId, subscriptionId: subscription.id, durationMs },
    'Subscription cancellation completed',
  );
}
