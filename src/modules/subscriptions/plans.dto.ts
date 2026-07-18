import { z } from 'zod';

import { CouponDiscountType, FeatureValueType, PlanType } from '../../types/enums';

// ─── Plan Core CRUD Schemas ──────────────────────────────────────────────────

export const CreatePlanSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required'),
    subtitle: z.string().optional(),
    description: z.string().optional().nullable(),
    price: z.number().positive('Price must be positive').optional(),
    priceCents: z.number().int().positive('Price cents must be positive').optional(),
    currency: z.string().default('USD'),
    durationDays: z.number().int().positive('Duration must be positive').default(30),
    trialDays: z.number().int().nonnegative('Trial days must be non-negative').default(0),
    setupFee: z.number().nonnegative('Setup fee must be non-negative').optional(),
    setupFeeCents: z.number().int().nonnegative('Setup fee cents must be non-negative').default(0),
    isRecurring: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    badge: z.string().optional().nullable(),
    planType: z.enum(PlanType).default(PlanType.ALL_ACCESS),
    targetStateId: z.string().optional().nullable(),
    targetCountry: z.string().optional().nullable(),
    targetCategoryId: z.string().uuid().optional().nullable(),
    bundleSize: z.number().int().positive().optional().nullable(),

    features: z
      .array(
        z.object({
          featureKey: z.string().min(1, 'Feature key is required'),
          limitValue: z.string().min(1, 'Limit value is required'),
        }),
      )
      .optional(),

    countryPricing: z
      .array(
        z.object({
          country: z.string().min(1, 'Country is required'),
          currency: z.string().min(1, 'Currency is required'),
          priceCents: z.number().int().positive('Price cents must be positive'),
        }),
      )
      .optional(),

    categoryPricing: z
      .array(
        z.object({
          categoryId: z.string().uuid('Invalid category ID'),
          priceCents: z.number().int().positive('Price cents must be positive'),
        }),
      )
      .optional(),
  })
  .refine((data) => data.price !== undefined || data.priceCents !== undefined, {
    message: 'Either price or priceCents must be provided',
    path: ['price'],
  });

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;

// ─── Path Parameters Schemas ─────────────────────────────────────────────────

export const PlanIdParamSchema = z.object({
  id: z.string().uuid('Invalid plan ID format'),
});

export type PlanIdParamDto = z.infer<typeof PlanIdParamSchema>;

export const VersionIdParamSchema = z.object({
  versionId: z.string().uuid('Invalid version ID format'),
});

export type VersionIdParamDto = z.infer<typeof VersionIdParamSchema>;

export const ReviewIdParamSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID format'),
});

export type ReviewIdParamDto = z.infer<typeof ReviewIdParamSchema>;

// ─── Plan Review Schemas ─────────────────────────────────────────────────────

export const AssignReviewerBodySchema = z.object({
  reviewerId: z.string().uuid('Invalid reviewer ID format'),
});

export type AssignReviewerBodyDto = z.infer<typeof AssignReviewerBodySchema>;

export const SubmitReviewActionBodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  comment: z.string().optional().nullable(),
  commentText: z.string().optional().nullable(),
});

export type SubmitReviewActionBodyDto = z.infer<typeof SubmitReviewActionBodySchema>;

// ─── Coupon Schemas ──────────────────────────────────────────────────────────

export const CreateCouponSchema = z.object({
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  code: z.string().min(1, 'Coupon code is required'),
  type: z.nativeEnum(CouponDiscountType),
  value: z.number().int().min(0, 'Discount value must be non-negative'),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  maxRedemptionsPerUser: z.number().int().min(1).optional().nullable(),
  minPurchaseCents: z.number().int().min(0).optional().nullable(),
  maxDiscountCents: z.number().int().min(0).optional().nullable(),
  firstPurchaseOnly: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  validFrom: z
    .preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional())
    .nullable(),
  expiresAt: z
    .preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional())
    .nullable(),
});

export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;

// ─── Subscription Migration Schemas ──────────────────────────────────────────

export const InitiateSubscriptionMigrationSchema = z
  .object({
    sourcePlanVersionId: z.string().uuid().optional(),
    targetPlanVersionId: z.string().uuid().optional(),
    sourcePlanId: z.string().uuid().optional(),
    targetPlanId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      (data.sourcePlanVersionId ?? data.sourcePlanId) &&
      (data.targetPlanVersionId ?? data.targetPlanId),
    {
      message: 'Both source and target plan/version IDs must be provided',
    },
  );

export type InitiateSubscriptionMigrationDto = z.infer<typeof InitiateSubscriptionMigrationSchema>;

// ─── Features Catalog Schemas ────────────────────────────────────────────────

export const CreateFeatureCatalogItemSchema = z.object({
  key: z.string().min(1, 'featureKey (key) is required'),
  name: z.string().min(1, 'displayName (name) is required'),
  description: z.string().optional().nullable(),
  category: z.string().default('General'),
  valueType: z.nativeEnum(FeatureValueType).default(FeatureValueType.BOOLEAN),
  defaultValue: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
});

export type CreateFeatureCatalogItemDto = z.infer<typeof CreateFeatureCatalogItemSchema>;
