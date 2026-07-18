import { AppDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { Coupon } from '../../database/entities/Coupon';
import { FeatureCatalog } from '../../database/entities/FeatureCatalog';
import { Plan } from '../../database/entities/Plan';
import { PlanCategoryPricing } from '../../database/entities/PlanCategoryPricing';
import { PlanCountryPricing } from '../../database/entities/PlanCountryPricing';
import { PlanFeature } from '../../database/entities/PlanFeature';
import { PlanReview } from '../../database/entities/PlanReview';
import { PlanReviewAssignment } from '../../database/entities/PlanReviewAssignment';
import { PlanReviewComment } from '../../database/entities/PlanReviewComment';
import { PlanVersion } from '../../database/entities/PlanVersion';
import { Subscription } from '../../database/entities/Subscription';
import { SubscriptionMigration } from '../../database/entities/SubscriptionMigration';
import { Transaction } from '../../database/entities/Transaction';
import {
  PlanStatus,
  PlanVersionStatus,
  ReviewAssignmentStatus,
  ReviewStatus,
  SubscriptionMigrationStatus,
  SubscriptionStatus,
  TransactionStatus,
} from '../../types/enums';

import type { PlanType } from '../../types/enums';
import type { DeepPartial } from 'typeorm';

const planRepository = AppDataSource.getRepository(Plan);
const planVersionRepository = AppDataSource.getRepository(PlanVersion);
const featureCatalogRepository = AppDataSource.getRepository(FeatureCatalog);
const planFeatureRepository = AppDataSource.getRepository(PlanFeature);
const planCountryPricingRepository = AppDataSource.getRepository(PlanCountryPricing);
const planReviewAssignmentRepository = AppDataSource.getRepository(PlanReviewAssignment);
const planCategoryPricingRepository = AppDataSource.getRepository(PlanCategoryPricing);
const couponRepository = AppDataSource.getRepository(Coupon);
const planReviewRepository = AppDataSource.getRepository(PlanReview);
// const planReviewCommentRepository = AppDataSource.getRepository(PlanReviewComment);
const subscriptionMigrationRepository = AppDataSource.getRepository(SubscriptionMigration);
const subscriptionRepository = AppDataSource.getRepository(Subscription);
const transactionRepository = AppDataSource.getRepository(Transaction);

// ─── Plan Workflows ─────────────────────────────────────────────────────────

export async function listAllPlans(): Promise<Plan[]> {
  return planRepository.find({
    relations: [
      'activeVersion',
      'activeVersion.features',
      'activeVersion.countryPricing',
      'activeVersion.categoryPricing',
    ],
    order: { createdAt: 'DESC' },
  });
}

export async function getPlanById(id: string): Promise<Plan> {
  const plan = await planRepository.findOne({
    where: { id },
    relations: [
      'versions',
      'versions.features',
      'versions.countryPricing',
      'versions.categoryPricing',
      'versions.reviews',
      'versions.reviews.comments',
      'versions.reviews.comments.author',
      'activeVersion',
      'activeVersion.features',
      'activeVersion.countryPricing',
      'activeVersion.categoryPricing',
    ],
  });
  if (!plan)
    throw new AppError(
      AppErrorMessage.PLAN_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  return plan;
}

export interface CreatePlanInput {
  name: string;
  subtitle?: string | null | undefined;
  description?: string | null | undefined;
  priceCents: number;
  currency?: string | undefined;
  durationDays?: number | undefined;
  trialDays?: number | undefined;
  setupFeeCents?: number | undefined;
  isRecurring?: boolean | undefined;
  isFeatured?: boolean | undefined;
  badge?: string | null | undefined;
  planType: PlanType;
  targetStateId?: string | null | undefined;
  targetCountry?: string | null | undefined;
  targetCategoryId?: string | null | undefined;
  bundleSize?: number | null | undefined;
  features?: Array<{ featureKey: string; limitValue: string }> | undefined;
  countryPricing?: Array<{ country: string; currency: string; priceCents: number }> | undefined;
  categoryPricing?: Array<{ categoryId: string; priceCents: number }> | undefined;
}

export async function createPlan(dto: CreatePlanInput, createdById: string): Promise<Plan> {
  return AppDataSource.transaction(async (manager) => {
    const count = await manager.count(Plan);
    const referenceNo = `PLN-${(count + 1).toString().padStart(3, '0')}`;

    const plan = manager.create(Plan, {
      referenceNo,
      status: PlanStatus.ACTIVE,
    });
    const savedPlan = await manager.save(Plan, plan);

    const version = manager.create(PlanVersion, {
      planId: savedPlan.id,
      version: 1,
      status: PlanVersionStatus.DRAFT,
      name: dto.name,
      subtitle: dto.subtitle ?? null,
      description: dto.description ?? null,
      priceCents: dto.priceCents,
      currency: dto.currency ?? 'USD',
      durationDays: dto.durationDays ?? 30,
      trialDays: dto.trialDays ?? 0,
      setupFeeCents: dto.setupFeeCents ?? 0,
      isRecurring: dto.isRecurring ?? true,
      isFeatured: dto.isFeatured ?? false,
      badge: dto.badge ?? null,
      planType: dto.planType,
      targetStateId: dto.targetStateId ? parseInt(dto.targetStateId, 10) : null,
      targetCountry: dto.targetCountry ?? null,
      targetCategoryId: dto.targetCategoryId ?? null,
      bundleSize: dto.bundleSize ?? null,
      createdByUserId: createdById,
    });
    const savedVersion = await manager.save(PlanVersion, version);

    // Save Features
    if (dto.features && Array.isArray(dto.features)) {
      for await (const featureItem of dto.features) {
        const planFeature = manager.create(PlanFeature, {
          planVersionId: savedVersion.id,
          featureKey: featureItem.featureKey,
          limitValue: featureItem.limitValue,
        });
        await manager.save(PlanFeature, planFeature);
      }
    }

    // Save Country Pricing overrides
    if (dto.countryPricing && Array.isArray(dto.countryPricing)) {
      for (const countryPricingItem of dto.countryPricing) {
        const planCountryPricing = manager.create(PlanCountryPricing, {
          planVersionId: savedVersion.id,
          country: countryPricingItem.country,
          currency: countryPricingItem.currency,
          priceCents: countryPricingItem.priceCents,
        });
        await manager.save(PlanCountryPricing, planCountryPricing);
      }
    }

    // Save Category Pricing overrides
    if (dto.categoryPricing && Array.isArray(dto.categoryPricing)) {
      for (const categoryPricingItem of dto.categoryPricing) {
        const planCategoryPricing = manager.create(PlanCategoryPricing, {
          planVersionId: savedVersion.id,
          categoryId: categoryPricingItem.categoryId,
          priceCents: categoryPricingItem.priceCents,
        });
        await manager.save(PlanCategoryPricing, planCategoryPricing);
      }
    }

    savedPlan.activeVersionId = savedVersion.id;
    await manager.save(Plan, savedPlan);

    return savedPlan;
  });
}

export async function createPlanVersionDraft(
  planId: string,
  createdById: string,
): Promise<PlanVersion> {
  const plan = await planRepository.findOne({
    where: { id: planId },
    relations: ['versions', 'activeVersion'],
  });
  if (!plan)
    throw new AppError(
      AppErrorMessage.PLAN_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  // Verify no current draft exists
  const existingDraft = plan.versions.find(
    (v) =>
      v.status === PlanVersionStatus.DRAFT ||
      v.status === PlanVersionStatus.SUBMITTED ||
      v.status === PlanVersionStatus.UNDER_REVIEW,
  );
  if (existingDraft) {
    throw new AppError(
      AppErrorMessage.PLAN_DRAFT_EXISTS,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.DRAFT_EXISTS,
    );
  }

  const latestVersion = plan.versions.reduce((max, v) => (v.version > max ? v.version : max), 0);

  return AppDataSource.transaction(async (manager) => {
    const activeVer = plan.activeVersion;
    const baseVer = activeVer ?? plan.versions[0];
    if (!baseVer) {
      throw new AppError(
        AppErrorMessage.PLAN_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    const draft = manager.create(PlanVersion, {
      planId,
      version: latestVersion + 1,
      status: PlanVersionStatus.DRAFT,
      name: baseVer.name,
      subtitle: baseVer.subtitle,
      description: baseVer.description,
      priceCents: baseVer.priceCents,
      currency: baseVer.currency,
      durationDays: baseVer.durationDays,
      trialDays: baseVer.trialDays,
      setupFeeCents: baseVer.setupFeeCents,
      isRecurring: baseVer.isRecurring,
      isFeatured: baseVer.isFeatured,
      badge: baseVer.badge,
      planType: baseVer.planType,
      targetStateId: baseVer.targetStateId,
      targetCountry: baseVer.targetCountry,
      targetCategoryId: baseVer.targetCategoryId,
      bundleSize: baseVer.bundleSize,
      createdByUserId: createdById,
    });
    const savedDraft = await manager.save(PlanVersion, draft);

    // Copy features
    const features = await planFeatureRepository.find({ where: { planVersionId: baseVer.id } });
    for (const featureItem of features) {
      const planFeature = manager.create(PlanFeature, {
        planVersionId: savedDraft.id,
        featureKey: featureItem.featureKey,
        limitValue: featureItem.limitValue,
      });
      await manager.save(PlanFeature, planFeature);
    }

    // Copy country pricing
    const countryPricing = await planCountryPricingRepository.find({
      where: { planVersionId: baseVer.id },
    });
    for (const countryPricingItem of countryPricing) {
      const planCountryPricing = manager.create(PlanCountryPricing, {
        planVersionId: savedDraft.id,
        country: countryPricingItem.country,
        currency: countryPricingItem.currency,
        priceCents: countryPricingItem.priceCents,
      });
      await manager.save(PlanCountryPricing, planCountryPricing);
    }

    // Copy category pricing
    const categoryPricing = await planCategoryPricingRepository.find({
      where: { planVersionId: baseVer.id },
    });
    for (const categoryPricingItem of categoryPricing) {
      const planCategoryPricing = manager.create(PlanCategoryPricing, {
        planVersionId: savedDraft.id,
        categoryId: categoryPricingItem.categoryId,
        priceCents: categoryPricingItem.priceCents,
      });
      await manager.save(PlanCategoryPricing, planCategoryPricing);
    }

    return savedDraft;
  });
}

// ─── Plan Review Flows ──────────────────────────────────────────────────────

export async function submitPlanForReview(versionId: string): Promise<PlanVersion> {
  const version = await planVersionRepository.findOne({ where: { id: versionId } });
  if (!version)
    throw new AppError(
      AppErrorMessage.VERSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (version.status !== PlanVersionStatus.DRAFT) {
    throw new AppError(
      AppErrorMessage.ONLY_DRAFT_PLANS_REVIEWED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INVALID_STATUS,
    );
  }

  version.status = PlanVersionStatus.SUBMITTED;
  await planVersionRepository.save(version);

  const review = planReviewRepository.create({
    planId: version.planId,
    planVersionId: version.id,
    status: ReviewStatus.PENDING,
  });
  await planReviewRepository.save(review);

  return version;
}

export async function assignPlanReviewer(
  reviewId: string,
  reviewerId: string,
): Promise<PlanReview> {
  const review = await planReviewRepository.findOne({
    where: { id: reviewId },
    relations: ['planVersion'],
  });
  if (!review)
    throw new AppError(
      AppErrorMessage.REVIEW_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  // Enforce reviewer cannot approve their own plan changes
  if (review.planVersion.createdBy === reviewerId) {
    throw new AppError(
      AppErrorMessage.REVIEWERS_SELF_REVIEW_BLOCKED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.SELF_REVIEW_FORBIDDEN,
    );
  }

  // Create or update reviewer assignment
  let assignment = await planReviewAssignmentRepository.findOne({
    where: { reviewId, reviewerId },
  });
  if (!assignment) {
    assignment = planReviewAssignmentRepository.create({
      reviewId,
      reviewerId,
      status: ReviewAssignmentStatus.UNDER_REVIEW,
    });
  } else {
    assignment.status = ReviewAssignmentStatus.UNDER_REVIEW;
  }
  await planReviewAssignmentRepository.save(assignment);

  review.status = ReviewStatus.UNDER_REVIEW;
  await planReviewRepository.save(review);

  review.planVersion.status = PlanVersionStatus.UNDER_REVIEW;
  await planVersionRepository.save(review.planVersion);

  return review;
}

export async function submitPlanReviewAction(
  reviewId: string,
  authorId: string,
  commentText: string,
  action: 'APPROVE' | 'REQUEST_CHANGES',
): Promise<PlanReview> {
  const review = await planReviewRepository.findOne({
    where: { id: reviewId },
    relations: ['planVersion'],
  });
  if (!review)
    throw new AppError(
      AppErrorMessage.REVIEW_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  const assignment = await planReviewAssignmentRepository.findOne({
    where: { reviewId, reviewerId: authorId },
  });
  if (!assignment) {
    throw new AppError(
      AppErrorMessage.NOT_ASSIGNED_PLAN_REVIEWER,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.FORBIDDEN,
    );
  }

  return AppDataSource.transaction(async (manager) => {
    const comment = manager.create(PlanReviewComment, {
      planReviewId: reviewId,
      authorId,
      commentText,
    });
    await manager.save(PlanReviewComment, comment);

    if (action === 'APPROVE') {
      review.status = ReviewStatus.APPROVED;
      review.planVersion.status = PlanVersionStatus.APPROVED;
      review.planVersion.approvedByUserId = authorId;
      review.planVersion.approvedAt = new Date();
      assignment.status = ReviewAssignmentStatus.APPROVED;
    } else {
      review.status = ReviewStatus.CHANGES_REQUESTED;
      review.planVersion.status = PlanVersionStatus.DRAFT;
      assignment.status = ReviewAssignmentStatus.REJECTED;
    }

    assignment.reviewedAt = new Date();
    await manager.save(PlanReviewAssignment, assignment);

    await manager.save(PlanReview, review);
    await manager.save(PlanVersion, review.planVersion);

    return review;
  });
}

export async function publishPlanVersion(versionId: string): Promise<Plan> {
  const version = await planVersionRepository.findOne({
    where: { id: versionId },
    relations: ['plan'],
  });
  if (!version)
    throw new AppError(
      AppErrorMessage.VERSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (version.status !== 'APPROVED') {
    throw new AppError(
      AppErrorMessage.ONLY_APPROVED_PLANS_PUBLISHED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.NOT_APPROVED,
    );
  }

  return AppDataSource.transaction(async (manager) => {
    version.status = PlanVersionStatus.PUBLISHED;
    await manager.save(PlanVersion, version);

    const { plan } = version;
    plan.activeVersionId = version.id;
    await manager.save(Plan, plan);

    return plan;
  });
}

// ─── Coupon Management ──────────────────────────────────────────────────────

export async function createCoupon(dto: DeepPartial<Coupon>): Promise<Coupon> {
  const coupon = couponRepository.create(dto);
  return couponRepository.save(coupon);
}

export async function listCoupons(): Promise<Coupon[]> {
  return couponRepository.find({ order: { createdAt: 'DESC' } });
}

export async function toggleCouponStatus(id: string): Promise<Coupon> {
  const coupon = await couponRepository.findOne({ where: { id } });
  if (!coupon)
    throw new AppError(
      AppErrorMessage.COUPON_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  coupon.isActive = !coupon.isActive;
  return couponRepository.save(coupon);
}

// ─── Subscription Migration Engine ──────────────────────────────────────────

export async function initiateSubscriptionMigration(
  sourcePlanVersionId: string,
  targetPlanVersionId: string,
  createdById: string,
): Promise<SubscriptionMigration> {
  const migration = subscriptionMigrationRepository.create({
    sourcePlanVersionId,
    targetPlanVersionId,
    status: SubscriptionMigrationStatus.PENDING,
    createdById,
  });
  await subscriptionMigrationRepository.save(migration);

  // Trigger migration immediately in background for dev/local
  setImmediate(async () => {
    try {
      logger.info(
        { migrationId: migration.id },
        'Subscription migration background execution started',
      );
      migration.status = SubscriptionMigrationStatus.RUNNING;
      migration.startedAt = new Date();
      await subscriptionMigrationRepository.save(migration);

      const affectedSubscriptions = await subscriptionRepository.find({
        where: { planVersionId: sourcePlanVersionId },
      });

      for (const subscription of affectedSubscriptions) {
        subscription.planVersionId = targetPlanVersionId;
        await subscriptionRepository.save(subscription);
      }

      migration.status = SubscriptionMigrationStatus.COMPLETED;
      migration.completedAt = new Date();
      await subscriptionMigrationRepository.save(migration);
      logger.info(
        { migrationId: migration.id, migratedCount: affectedSubscriptions.length },
        'Subscription migration completed successfully',
      );
    } catch (err) {
      logger.error({ migrationId: migration.id, err }, 'Subscription migration execution failed');
      migration.status = SubscriptionMigrationStatus.FAILED;
      migration.completedAt = new Date();
      await subscriptionMigrationRepository.save(migration);
    }
  });

  return migration;
}

// ─── Analytics & Catalog ────────────────────────────────────────────────────

export async function getFeatureCatalog(): Promise<FeatureCatalog[]> {
  return featureCatalogRepository.find({ order: { displayName: 'ASC' } });
}

export async function createFeatureCatalogItem(
  dto: DeepPartial<FeatureCatalog>,
): Promise<FeatureCatalog> {
  const featureCatalogItem = featureCatalogRepository.create(dto);
  return featureCatalogRepository.save(featureCatalogItem);
}

export interface SubscriptionsDashboardStats {
  totalRevenue: string;
  mrr: string;
  arr: string;
  activeSubscriptions: number;
  newThisMonth: number;
  renewalsThisMonth: number;
  expired: number;
  trialUsers: number;
  churnRate: string;
  arpu: string | number;
  ltv: string | number;
  failedPayments: number;
}

export async function getSubscriptionsDashboardStats(): Promise<SubscriptionsDashboardStats> {
  const totalRevenueRow = await transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amountCents)', 'total')
    .where('t.status = :status', { status: TransactionStatus.SUCCESS })
    .getRawOne();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const totalRevenue = totalRevenueRow ? (parseInt(totalRevenueRow.total, 10) ?? 0) : 0;

  const activeSubCount = await subscriptionRepository.count({
    where: { status: SubscriptionStatus.ACTIVE },
  });
  const expiredSubCount = await subscriptionRepository.count({
    where: { status: SubscriptionStatus.EXPIRED },
  });

  // Mock trend details for KPIs
  return {
    totalRevenue: (totalRevenue / 100).toFixed(2),
    mrr: (totalRevenue / 100 / 12).toFixed(2), // Simplistic calculation
    arr: (totalRevenue / 100).toFixed(2),
    activeSubscriptions: activeSubCount,
    newThisMonth: Math.round(activeSubCount * 0.15),
    renewalsThisMonth: Math.round(activeSubCount * 0.08),
    expired: expiredSubCount,
    trialUsers: Math.round(activeSubCount * 0.25),
    churnRate: '4.2%',
    arpu: activeSubCount > 0 ? (totalRevenue / 100 / activeSubCount).toFixed(2) : 0,
    ltv: activeSubCount > 0 ? ((totalRevenue / 100 / activeSubCount) * 18).toFixed(2) : 0,
    failedPayments: await transactionRepository.count({
      where: { status: TransactionStatus.FAILED },
    }),
  };
}
