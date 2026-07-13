import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission, requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { auditLogger } from '../../middleware/auditLogger';
import { AccountType, PermissionKey } from '../../types/enums';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  SubmitCategoryReviewDto,
  CategoryReviewDecisionDto,
  MergeCategoryDto,
} from './categories.dto';
import * as controller from './categories.controller';

const router = Router();

// Public routes
router.get(
  '/tree',
  validate(CategoryQueryDto, 'query'),
  controller.getCategoryTree
);

router.get(
  '/',
  validate(CategoryQueryDto, 'query'),
  controller.listCategories
);

// Admin-protected routes
const adminAuth = [authenticate, requireRole(AccountType.ADMIN)];

router.get(
  '/analytics',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_VIEW),
  controller.getAnalytics
);

router.post(
  '/',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_CREATE),
  validate(CreateCategoryDto),
  auditLogger('category.create', 'category'),
  controller.createCategory
);

router.patch(
  '/:id',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_UPDATE),
  validate(UpdateCategoryDto),
  auditLogger('category.update', 'category'),
  controller.updateCategory
);

router.post(
  '/:id/versions/:versionId/submit',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_REVIEW),
  validate(SubmitCategoryReviewDto),
  auditLogger('category.submit_review', 'category'),
  controller.submitVersion
);

router.post(
  '/reviews/:reviewId/decision',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_APPROVE),
  validate(CategoryReviewDecisionDto),
  auditLogger('category.review_decision', 'category'),
  controller.reviewVersion
);

router.post(
  '/merge',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_MERGE),
  validate(MergeCategoryDto),
  auditLogger('category.merge', 'category'),
  controller.mergeCategories
);

router.get(
  '/reviews',
  adminAuth,
  requirePermission(PermissionKey.CATEGORY_VIEW),
  controller.listReviews
);

export default router;
export { router as categoriesRouter };
