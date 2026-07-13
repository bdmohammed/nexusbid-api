import { AppDataSource } from "../../config/database";
import { Plan } from "../../database/entities/Plan";
import { Subscription } from "../../database/entities/Subscription";
import { Coupon } from "../../database/entities/Coupon";
import { AppError } from "../../core/AppError";
import { SubscriptionStatus } from "../../types/enums";
import {
  createSubscription as paypalCreateSubscription,
  getSubscriptionApprovalUrl,
  cancelSubscription as paypalCancelSubscription,
} from "../../services/paypal/paypal.subscriptions";
import {
  createOrder as paypalCreateOrder,
  getApprovalUrl as paypalGetOrderApprovalUrl,
} from "../../services/paypal/paypal.orders";
import type { CreateSubscriptionDto } from "./subscriptions.dto";
import { logger } from "../../config/logger";
import { performance } from "perf_hooks";

const planRepo = AppDataSource.getRepository(Plan);
const subRepo = AppDataSource.getRepository(Subscription);
const couponRepo = AppDataSource.getRepository(Coupon);

// ─── List active plans ────────────────────────────────────────────────────────

export async function listPlans(): Promise<Plan[]> {
  return planRepo.find({
    where: { status: "ACTIVE" },
    relations: [
      "activeVersion",
      "activeVersion.features",
      "activeVersion.countryPricing",
      "activeVersion.categoryPricing",
    ],
  });
}

// ─── Create subscription ──────────────────────────────────────────────────────

export async function createSubscription(
  dto: CreateSubscriptionDto & { couponCode?: string },
  user: {
    userId: string;
    name: string;
    email: string;
    country?: string | null;
  },
): Promise<{ approvalUrl: string; subscriptionId: string }> {
  const start = performance.now();

  // Verify plan exists and is active
  const plan = await planRepo.findOne({
    where: { id: dto.planId, status: "ACTIVE" },
    relations: [
      "activeVersion",
      "activeVersion.countryPricing",
      "activeVersion.categoryPricing",
    ],
  });
  if (!plan || !plan.activeVersionId || !plan.activeVersion) {
    throw new AppError("Plan not found or inactive", 404, "NOT_FOUND");
  }

  const activeVer = plan.activeVersion;

  // Enforce targeting and bundle constraints
  if (activeVer.planType === "state" && !dto.targetStateId) {
    throw new AppError(
      "State selection required for state-specific plan",
      400,
      "STATE_REQUIRED",
    );
  }
  if (activeVer.planType === "country" && !dto.targetCountry) {
    throw new AppError(
      "Country selection required for country-specific plan",
      400,
      "COUNTRY_REQUIRED",
    );
  }
  if (activeVer.planType === "category" && !dto.targetCategoryId) {
    throw new AppError(
      "Category selection required for category-specific plan",
      400,
      "CATEGORY_REQUIRED",
    );
  }
  if (activeVer.planType === "bundle") {
    if (!dto.selectedCategoryIds || dto.selectedCategoryIds.length === 0) {
      throw new AppError(
        "Category selections required for custom bundle plan",
        400,
        "CATEGORIES_REQUIRED",
      );
    }
    if (
      activeVer.bundleSize &&
      dto.selectedCategoryIds.length > activeVer.bundleSize
    ) {
      throw new AppError(
        `You can select at most ${activeVer.bundleSize} categories`,
        400,
        "MAX_CATEGORIES_EXCEEDED",
      );
    }
  }

  // Check if user already has an active subscription for the SAME target or overall
  const existing = await subRepo.findOne({
    where: { userId: user.userId, status: SubscriptionStatus.ACTIVE },
  });
  if (existing) {
    if (existing.paypalSubscriptionId || existing.paypalOrderId) {
      throw new AppError(
        "You already have an active subscription",
        409,
        "ALREADY_SUBSCRIBED",
      );
    }
  }

  let approvalUrl: string;
  let subscriptionId: string | null = null;
  let orderId: string | null = null;
  let finalPriceCents = activeVer.priceCents;

  // 1. Geographic Pricing Override
  if (user.country && activeVer.countryPricing) {
    const match = activeVer.countryPricing.find(
      (cp) => cp.country.toLowerCase() === user.country!.toLowerCase(),
    );
    if (match) {
      finalPriceCents = match.priceCents;
    }
  }

  // 2. Category Pricing Override
  if (
    activeVer.planType === "category" &&
    dto.targetCategoryId &&
    activeVer.categoryPricing
  ) {
    const match = activeVer.categoryPricing.find(
      (catP) => catP.categoryId === dto.targetCategoryId,
    );
    if (match) {
      finalPriceCents = match.priceCents;
    }
  }

  // 3. Apply Coupon Discount (Coupon Code checking)
  let couponId: string | null = null;
  if (dto.couponCode) {
    const coupon = await couponRepo.findOne({
      where: { code: dto.couponCode, isActive: true },
    });
    if (!coupon)
      throw new AppError(
        "Coupon not found or inactive",
        404,
        "COUPON_NOT_FOUND",
      );

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError("Coupon has expired", 400, "COUPON_EXPIRED");
    }
    if (
      coupon.maxRedemptions !== null &&
      coupon.redemptionCount >= coupon.maxRedemptions
    ) {
      throw new AppError(
        "Coupon usage limit reached",
        400,
        "COUPON_LIMIT_REACHED",
      );
    }

    if (coupon.discountType === "percentage") {
      finalPriceCents = Math.round(
        finalPriceCents * (1 - coupon.discountValue / 100),
      );
    } else if (coupon.discountType === "fixed") {
      finalPriceCents = Math.max(0, finalPriceCents - coupon.discountValue);
    } else if (coupon.discountType === "free_month") {
      finalPriceCents = 0;
    }

    couponId = coupon.id;
    coupon.redemptionCount += 1;
    await couponRepo.save(coupon);
  }

  if (
    activeVer.isRecurring &&
    activeVer.badge !== "Enterprise" &&
    finalPriceCents > 0
  ) {
    // Create subscription with PayPal Subscriptions API (v1)
    // Here we'd map to a PayPal plan. In mock/local, we simulate approval url.
    const mockPaypalSub = {
      id: `I-MOCK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    };
    approvalUrl = `${dto.returnUrl}?subscription_id=${mockPaypalSub.id}`;
    subscriptionId = mockPaypalSub.id;
  } else {
    // Create one-time purchase with PayPal Orders API (v2)
    const mockOrder = {
      id: `ORD-MOCK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    };
    approvalUrl = `${dto.returnUrl}?token=${mockOrder.id}`;
    orderId = mockOrder.id;
  }

  // Calculate duration
  const startDate = new Date();
  const totalDays = activeVer.durationDays + activeVer.trialDays;
  const endDate = new Date(
    startDate.getTime() + totalDays * 24 * 60 * 60 * 1000,
  );

  const subscription = subRepo.create({
    userId: user.userId,
    planId: plan.id,
    planVersionId: activeVer.id,
    couponId,
    startDate,
    endDate,
    status: SubscriptionStatus.ACTIVE,
    paypalSubscriptionId: subscriptionId,
    paypalOrderId: orderId,
    targetStateId: dto.targetStateId || null,
    targetCountry: dto.targetCountry || null,
    targetCategoryId: dto.targetCategoryId || null,
    selectedCategoryIds: dto.selectedCategoryIds || null,
  });

  await subRepo.save(subscription);

  // Log audit info
  logger.info(
    { planId: dto.planId, versionId: activeVer.id, finalPriceCents },
    "Subscription created",
  );

  const durationMs = performance.now() - start;
  logger.info(
    { planId: dto.planId, userId: user.userId, durationMs },
    "Subscription creation completed",
  );

  return { approvalUrl, subscriptionId: (subscriptionId || orderId) as string };
}

// ─── Get current user's active subscription ───────────────────────────────────

export async function getMySubscription(userId: string): Promise<{
  subscription: Subscription | null;
  plan: Plan | null;
}> {
  const sub = await subRepo.findOne({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ["plan", "planVersion"],
    order: { createdAt: "DESC" },
  });

  if (!sub) return { subscription: null, plan: null };
  return { subscription: sub, plan: sub.plan };
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelMySubscription(userId: string): Promise<void> {
  const start = performance.now();
  const sub = await subRepo.findOne({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ["plan"],
  });

  if (!sub)
    throw new AppError("No active subscription found", 404, "NOT_FOUND");

  if (sub.paypalSubscriptionId) {
    try {
      await paypalCancelSubscription(sub.paypalSubscriptionId);
    } catch (e) {
      logger.warn(
        { error: e },
        "PayPal cancel failed, moving forward with local cancel",
      );
    }
  }

  await subRepo.update(sub.id, { status: SubscriptionStatus.CANCELLED });

  const durationMs = performance.now() - start;
  logger.info(
    { userId, subscriptionId: sub.id, durationMs },
    "Subscription cancellation completed",
  );
}
