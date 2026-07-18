import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { asyncHandler } from '../../core/asyncHandler';

import {
  AssignReviewerBodySchema,
  CreateCouponSchema,
  CreateFeatureCatalogItemSchema,
  CreatePlanSchema,
  InitiateSubscriptionMigrationSchema,
  PlanIdParamSchema,
  ReviewIdParamSchema,
  SubmitReviewActionBodySchema,
  VersionIdParamSchema,
} from './plans.dto';
import * as plansService from './plans.service';

import type { JwtPayload } from '../../types/express';
import type {
  AssignReviewerBodyDto,
  CreateCouponDto,
  CreateFeatureCatalogItemDto,
  CreatePlanDto,
  InitiateSubscriptionMigrationDto,
  PlanIdParamDto,
  ReviewIdParamDto,
  SubmitReviewActionBodyDto,
  VersionIdParamDto,
} from './plans.dto';

// ─── Plan Workflows ─────────────────────────────────────────────────────────

export const listAllPlans = asyncHandler(async (_req, res) => {
  const plans = await plansService.listAllPlans();
  res.json({ success: true, data: plans });
});

export const getPlanById = asyncHandler<PlanIdParamDto>(async (req, res) => {
  const { id } = PlanIdParamSchema.parse(req.params);
  const plan = await plansService.getPlanById(id);
  res.json({ success: true, data: plan });
});

export const createPlan = asyncHandler<{}, object, CreatePlanDto>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  const dto = CreatePlanSchema.parse(req.body);
  const priceCents = dto.priceCents ?? (dto.price ? Math.round(dto.price * 100) : 0);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const setupFeeCents = dto.setupFeeCents ?? (dto.setupFee ? Math.round(dto.setupFee * 100) : 0);

  const plan = await plansService.createPlan(
    {
      ...dto,
      priceCents,
      setupFeeCents,
    },
    userId,
  );
  res.status(201).json({ success: true, data: plan });
});

export const createPlanVersionDraft = asyncHandler<PlanIdParamDto>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  const { id } = PlanIdParamSchema.parse(req.params);
  const version = await plansService.createPlanVersionDraft(id, userId);
  res.status(201).json({ success: true, data: version });
});

// ─── Plan Review Flows ──────────────────────────────────────────────────────

export const submitPlanForReview = asyncHandler<VersionIdParamDto>(async (req, res) => {
  const { versionId } = VersionIdParamSchema.parse(req.params);
  const version = await plansService.submitPlanForReview(versionId);
  res.json({ success: true, data: version });
});

export const assignPlanReviewer = asyncHandler<ReviewIdParamDto, object, AssignReviewerBodyDto>(
  async (req, res) => {
    const { reviewId } = ReviewIdParamSchema.parse(req.params);
    const { reviewerId } = AssignReviewerBodySchema.parse(req.body);
    const review = await plansService.assignPlanReviewer(reviewId, reviewerId);
    res.json({ success: true, data: review });
  },
);

export const submitPlanReviewAction = asyncHandler<
  ReviewIdParamDto,
  object,
  SubmitReviewActionBodyDto
>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  const { reviewId } = ReviewIdParamSchema.parse(req.params);
  const dto = SubmitReviewActionBodySchema.parse(req.body);
  const action = dto.action === 'REJECT' ? 'REQUEST_CHANGES' : dto.action;
  const commentText = dto.commentText ?? dto.comment ?? '';

  const review = await plansService.submitPlanReviewAction(reviewId, userId, commentText, action);
  res.json({ success: true, data: review });
});

export const publishPlanVersion = asyncHandler<VersionIdParamDto>(async (req, res) => {
  const { versionId } = VersionIdParamSchema.parse(req.params);
  const plan = await plansService.publishPlanVersion(versionId);
  res.json({ success: true, data: plan });
});

// ─── Coupons ────────────────────────────────────────────────────────────────

export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await plansService.listCoupons();
  res.json({ success: true, data: coupons });
});

export const createCoupon = asyncHandler<{}, object, CreateCouponDto>(async (req, res) => {
  const dto = CreateCouponSchema.parse(req.body);
  const mapped = {
    name: dto.name ?? dto.code,
    description: dto.description ?? null,
    code: dto.code.toUpperCase(),
    discountType: dto.type,
    discountValue: dto.value,
    maxRedemptions: dto.maxRedemptions ?? null,
    maxRedemptionsPerUser: dto.maxRedemptionsPerUser ?? null,
    minPurchaseCents: dto.minPurchaseCents ?? null,
    maxDiscountCents: dto.maxDiscountCents ?? null,
    firstPurchaseOnly: dto.firstPurchaseOnly ?? false,
    isRecurring: dto.isRecurring ?? false,
    validFrom: dto.validFrom ?? null,
    expiresAt: dto.expiresAt ?? null,
  };

  const coupon = await plansService.createCoupon(mapped);
  res.status(201).json({ success: true, data: coupon });
});

export const toggleCouponStatus = asyncHandler<PlanIdParamDto>(async (req, res) => {
  const { id } = PlanIdParamSchema.parse(req.params);
  const coupon = await plansService.toggleCouponStatus(id);
  res.json({ success: true, data: coupon });
});

// ─── Migrations ─────────────────────────────────────────────────────────────

export const initiateSubscriptionMigration = asyncHandler<
  {},
  object,
  InitiateSubscriptionMigrationDto
>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  if (!userId) {
    throw new AppError(
      AppErrorMessage.USER_NOT_LOGGED_IN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }
  const dto = InitiateSubscriptionMigrationSchema.parse(req.body);
  const sourceId = dto.sourcePlanVersionId ?? dto.sourcePlanId;
  const targetId = dto.targetPlanVersionId ?? dto.targetPlanId;

  if (!sourceId || !targetId) {
    throw new AppError(
      AppErrorMessage.INVALID_INPUT,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const migration = await plansService.initiateSubscriptionMigration(sourceId, targetId, userId);
  res.json({ success: true, data: migration });
});

// ─── Dashboard Stats & Features Catalog ─────────────────────────────────────

export const getSubscriptionsDashboardStats = asyncHandler(async (_req, res) => {
  const stats = await plansService.getSubscriptionsDashboardStats();
  res.json({ success: true, data: stats });
});

export const getFeatureCatalog = asyncHandler(async (_req, res) => {
  const catalog = await plansService.getFeatureCatalog();
  res.json({ success: true, data: catalog });
});

export const createFeatureCatalogItem = asyncHandler<{}, object, CreateFeatureCatalogItemDto>(
  async (req, res) => {
    const dto = CreateFeatureCatalogItemSchema.parse(req.body);
    const mapped = {
      featureKey: dto.key,
      displayName: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      valueType: dto.valueType,
      defaultValue: dto.defaultValue ?? null,
      displayOrder: dto.displayOrder,
    };

    const item = await plansService.createFeatureCatalogItem(mapped);
    res.status(201).json({ success: true, data: item });
  },
);
