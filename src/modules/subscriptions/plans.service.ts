import { appDataSource } from '../../config/database';
import { Plan } from '../../entities/Plan';
import { PlanVersion } from '../../entities/PlanVersion';
import { FeatureCatalog } from '../../entities/FeatureCatalog';
import { PlanFeature } from '../../entities/PlanFeature';
import { PlanCountryPricing } from '../../entities/PlanCountryPricing';
import { PlanCategoryPricing } from '../../entities/PlanCategoryPricing';
import { Coupon } from '../../entities/Coupon';
import { PlanReview } from '../../entities/PlanReview';
import { PlanReviewComment } from '../../entities/PlanReviewComment';
import { SubscriptionMigration } from '../../entities/SubscriptionMigration';
import { Subscription } from '../../entities/Subscription';
import { Transaction } from '../../entities/Transaction';
import { AppError } from '../../core/AppError';
import { logger } from '../../config/logger';

const planRepository = appDataSource.getRepository(Plan);
const planVersionRepository = appDataSource.getRepository(PlanVersion);
const featureCatalogRepository = appDataSource.getRepository(FeatureCatalog);
const planFeatureRepository = appDataSource.getRepository(PlanFeature);
const planCountryPricingRepository = appDataSource.getRepository(PlanCountryPricing);
const planCategoryPricingRepository = appDataSource.getRepository(PlanCategoryPricing);
const couponRepository = appDataSource.getRepository(Coupon);
const planReviewRepository = appDataSource.getRepository(PlanReview);
const planReviewCommentRepository = appDataSource.getRepository(PlanReviewComment);
const subscriptionMigrationRepository = appDataSource.getRepository(SubscriptionMigration);
const subscriptionRepository = appDataSource.getRepository(Subscription);
const transactionRepository = appDataSource.getRepository(Transaction);

// ─── Plan Workflows ─────────────────────────────────────────────────────────

export async function listAllPlans(): Promise<Plan[]> {
  return planRepository.find({
    relations: ['activeVersion', 'activeVersion.features', 'activeVersion.countryPricing', 'activeVersion.categoryPricing'],
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
      'activeVersion.categoryPricing'
    ],
  });
  if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  return plan;
}

export async function createPlan(
  dto: any,
  createdById: string
): Promise<Plan> {
  return appDataSource.transaction(async (manager) => {
    const count = await manager.count(Plan);
    const referenceNo = `PLN-${(count + 1).toString().padStart(3, '0')}`;

    const plan = manager.create(Plan, {
      referenceNo,
      status: 'ACTIVE',
    });
    const savedPlan = await manager.save(Plan, plan);

    const version = manager.create(PlanVersion, {
      planId: savedPlan.id,
      version: 1,
      status: 'DRAFT',
      name: dto.name,
      subtitle: dto.subtitle || null,
      description: dto.description || null,
      priceCents: dto.priceCents,
      currency: dto.currency || 'USD',
      durationDays: dto.durationDays,
      trialDays: dto.trialDays || 0,
      setupFeeCents: dto.setupFeeCents || 0,
      isRecurring: dto.isRecurring !== undefined ? dto.isRecurring : true,
      isFeatured: dto.isFeatured || false,
      badge: dto.badge || null,
      planType: dto.planType || 'all-access',
      targetStateId: dto.targetStateId || null,
      targetCountry: dto.targetCountry || null,
      targetCategoryId: dto.targetCategoryId || null,
      bundleSize: dto.bundleSize || null,
      createdById,
    });
    const savedVersion = await manager.save(PlanVersion, version);

    // Save Features
    if (dto.features && Array.isArray(dto.features)) {
      for (const featureItem of dto.features) {
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
  createdById: string
): Promise<PlanVersion> {
  const plan = await planRepository.findOne({
    where: { id: planId },
    relations: ['versions', 'activeVersion'],
  });
  if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');

  // Verify no current draft exists
  const existingDraft = plan.versions.find((v) => v.status === 'DRAFT' || v.status === 'SUBMITTED' || v.status === 'UNDER_REVIEW');
  if (existingDraft) {
    throw new AppError('A draft or review version already exists for this plan', 400, 'DRAFT_EXISTS');
  }

  const latestVersion = plan.versions.reduce((max, v) => (v.version > max ? v.version : max), 0);

  return appDataSource.transaction(async (manager) => {
    const activeVer = plan.activeVersion;
    const baseVer = activeVer || plan.versions[0];

    const draft = manager.create(PlanVersion, {
      planId,
      version: latestVersion + 1,
      status: 'DRAFT',
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
      createdById,
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
    const countryPricing = await planCountryPricingRepository.find({ where: { planVersionId: baseVer.id } });
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
    const categoryPricing = await planCategoryPricingRepository.find({ where: { planVersionId: baseVer.id } });
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
  if (!version) throw new AppError('Version not found', 404, 'NOT_FOUND');
  if (version.status !== 'DRAFT') {
    throw new AppError('Only draft versions can be submitted for review', 400, 'INVALID_STATUS');
  }

  version.status = 'SUBMITTED';
  await planVersionRepository.save(version);

  const review = planReviewRepository.create({
    planVersionId: version.id,
    status: 'SUBMITTED',
  });
  await planReviewRepository.save(review);

  return version;
}

export async function assignPlanReviewer(
  reviewId: string,
  reviewerId: string
): Promise<PlanReview> {
  const review = await planReviewRepository.findOne({ where: { id: reviewId }, relations: ['planVersion'] });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');

  // Enforce reviewer cannot approve their own plan changes
  if (review.planVersion.createdById === reviewerId) {
    throw new AppError('Reviewers cannot review or approve their own plan modifications', 400, 'SELF_REVIEW_FORBIDDEN');
  }

  review.assignedReviewerId = reviewerId;
  review.status = 'UNDER_REVIEW';
  await planReviewRepository.save(review);

  review.planVersion.status = 'UNDER_REVIEW';
  await planVersionRepository.save(review.planVersion);

  return review;
}

export async function submitPlanReviewAction(
  reviewId: string,
  authorId: string,
  commentText: string,
  action: 'APPROVE' | 'REQUEST_CHANGES'
): Promise<PlanReview> {
  const review = await planReviewRepository.findOne({ where: { id: reviewId }, relations: ['planVersion'] });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');

  if (review.assignedReviewerId !== authorId) {
    throw new AppError('You are not assigned to review this plan version', 403, 'FORBIDDEN');
  }

  return appDataSource.transaction(async (manager) => {
    const comment = manager.create(PlanReviewComment, {
      planReviewId: reviewId,
      authorId,
      commentText,
    });
    await manager.save(PlanReviewComment, comment);

    if (action === 'APPROVE') {
      review.status = 'APPROVED';
      review.planVersion.status = 'APPROVED';
      review.planVersion.approvedById = authorId;
    } else {
      review.status = 'CHANGES_REQUESTED';
      review.planVersion.status = 'DRAFT';
    }

    await manager.save(PlanReview, review);
    await manager.save(PlanVersion, review.planVersion);

    return review;
  });
}

export async function publishPlanVersion(versionId: string): Promise<Plan> {
  const version = await planVersionRepository.findOne({ where: { id: versionId }, relations: ['plan'] });
  if (!version) throw new AppError('Version not found', 404, 'NOT_FOUND');
  if (version.status !== 'APPROVED') {
    throw new AppError('Only approved plan versions can be published', 400, 'NOT_APPROVED');
  }

  return appDataSource.transaction(async (manager) => {
    version.status = 'PUBLISHED';
    await manager.save(PlanVersion, version);

    const plan = version.plan;
    plan.activeVersionId = version.id;
    await manager.save(Plan, plan);

    return plan;
  });
}

// ─── Coupon Management ──────────────────────────────────────────────────────

export async function createCoupon(dto: any): Promise<Coupon> {
  const coupon = couponRepository.create(dto as any) as unknown as Coupon;
  return couponRepository.save(coupon);
}

export async function listCoupons(): Promise<Coupon[]> {
  return couponRepository.find({ order: { createdAt: 'DESC' } });
}

export async function toggleCouponStatus(id: string): Promise<Coupon> {
  const coupon = await couponRepository.findOne({ where: { id } });
  if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

  coupon.isActive = !coupon.isActive;
  return couponRepository.save(coupon);
}

// ─── Subscription Migration Engine ──────────────────────────────────────────

export async function initiateSubscriptionMigration(
  sourcePlanVersionId: string,
  targetPlanVersionId: string,
  createdById: string
): Promise<SubscriptionMigration> {
  const migration = subscriptionMigrationRepository.create({
    sourcePlanVersionId,
    targetPlanVersionId,
    status: 'PENDING',
    createdById,
  });
  await subscriptionMigrationRepository.save(migration);

  // Trigger migration immediately in background for dev/local
  setImmediate(async () => {
    try {
      logger.info({ migrationId: migration.id }, 'Subscription migration background execution started');
      migration.status = 'RUNNING';
      migration.startedAt = new Date();
      await subscriptionMigrationRepository.save(migration);

      const affectedSubscriptions = await subscriptionRepository.find({
        where: { planVersionId: sourcePlanVersionId },
      });

      for (const subscription of affectedSubscriptions) {
        subscription.planVersionId = targetPlanVersionId;
        await subscriptionRepository.save(subscription);
      }

      migration.status = 'COMPLETED';
      migration.completedAt = new Date();
      await subscriptionMigrationRepository.save(migration);
      logger.info({ migrationId: migration.id, migratedCount: affectedSubscriptions.length }, 'Subscription migration completed successfully');
    } catch (err) {
      logger.error({ migrationId: migration.id, err }, 'Subscription migration execution failed');
      migration.status = 'FAILED';
      migration.completedAt = new Date();
      await subscriptionMigrationRepository.save(migration);
    }
  });

  return migration;
}

// ─── Analytics & Catalog ────────────────────────────────────────────────────

export async function getFeatureCatalog(): Promise<FeatureCatalog[]> {
  return featureCatalogRepository.find({ order: { name: 'ASC' } });
}

export async function createFeatureCatalogItem(dto: any): Promise<FeatureCatalog> {
  const featureCatalogItem = featureCatalogRepository.create(dto as any) as unknown as FeatureCatalog;
  return featureCatalogRepository.save(featureCatalogItem);
}

export async function getSubscriptionsDashboardStats(): Promise<any> {
  const totalRevenueRow = await transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amountCents)', 'total')
    .where("t.status = 'success'")
    .getRawOne();
  const totalRevenue = totalRevenueRow ? parseInt(totalRevenueRow.total, 10) || 0 : 0;

  const activeSubCount = await subscriptionRepository.count({ where: { status: 'active' as any } });
  const expiredSubCount = await subscriptionRepository.count({ where: { status: 'expired' as any } });

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
    ltv: activeSubCount > 0 ? (totalRevenue / 100 / activeSubCount * 18).toFixed(2) : 0,
    failedPayments: await transactionRepository.count({ where: { status: 'failed' as any } }),
  };
}
