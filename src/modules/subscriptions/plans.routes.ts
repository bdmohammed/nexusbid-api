import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireSuperAdmin } from '../../middleware/permissions';
import * as controller from './plans.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FeatureItem:
 *       type: object
 *       required: [id, key, name]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         key:
 *           type: string
 *           example: "bid.limit"
 *         name:
 *           type: string
 *           example: "Monthly Bids Limit"
 *         description:
 *           type: string
 *           example: "Sets max tender bids user can submit per month"
 *
 *     Coupon:
 *       type: object
 *       required: [id, code, type, value, status]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "WINTER30"
 *         type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "percentage"
 *         value:
 *           type: number
 *           example: 30
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           example: "ACTIVE"
 */

// ─── Dashboard & Features ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/plans/dashboard:
 *   get:
 *     summary: Get subscriptions dashboard statistics (Super-Admin)
 *     description: |
 *       Resolves subscription KPIs, active count, and revenue streams.
 *       **Required Role:** `Super Admin`
 *     operationId: getSubscriptionsDashboardStats
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats resolved
 */
router.get('/dashboard', authenticate, requireSuperAdmin(), controller.getSubscriptionsDashboardStats);

/**
 * @swagger
 * /api/v1/plans/features:
 *   get:
 *     summary: List all plan features catalog (Super-Admin)
 *     description: |
 *       Lists features catalog.
 *       **Required Role:** `Super Admin`
 *     operationId: listPlanFeatures
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Features catalog list
 *
 *   post:
 *     summary: Add feature to plans catalog (Super-Admin)
 *     description: |
 *       Adds a feature tag config.
 *       **Required Role:** `Super Admin`
 *     operationId: createPlanFeature
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, name]
 *             properties:
 *               key: { type: string, example: "watcher.limit" }
 *               name: { type: string, example: "Tenders Watch Limit" }
 *     responses:
 *       201:
 *         description: Feature added successfully
 */
router.get('/features', authenticate, requireSuperAdmin(), controller.getFeatureCatalog);
router.post('/features', authenticate, requireSuperAdmin(), controller.createFeatureCatalogItem);

// ─── Coupon Codes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/plans/coupons:
 *   get:
 *     summary: Get all coupons list (Super-Admin)
 *     description: |
 *       Lists discount codes.
 *       **Required Role:** `Super Admin`
 *     operationId: listCoupons
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Coupons list
 *
 *   post:
 *     summary: Create coupon discount (Super-Admin)
 *     description: |
 *       Creates a new coupon.
 *       **Required Role:** `Super Admin`
 *     operationId: createCoupon
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value]
 *             properties:
 *               code: { type: string, example: "WINTER30" }
 *               type: { type: string, enum: [percentage, fixed], example: "percentage" }
 *               value: { type: number, example: 30 }
 *     responses:
 *       201:
 *         description: Coupon created
 */
router.get('/coupons', authenticate, requireSuperAdmin(), controller.listCoupons);
router.post('/coupons', authenticate, requireSuperAdmin(), controller.createCoupon);

/**
 * @swagger
 * /api/v1/plans/coupons/{id}/toggle:
 *   post:
 *     summary: Toggle coupon active status (Super-Admin)
 *     description: |
 *       Enables/Disables a coupon discount.
 *       **Required Role:** `Super Admin`
 *     operationId: toggleCouponStatus
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Status toggled successfully
 */
router.post('/coupons/:id/toggle', authenticate, requireSuperAdmin(), controller.toggleCouponStatus);

// ─── Subscription Migrations ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/plans/migrations:
 *   post:
 *     summary: Initiate subscriptions bulk migration (Super-Admin)
 *     description: |
 *       Migrates users from a retired plan version to a new version.
 *       **Required Role:** `Super Admin`
 *     operationId: migrateSubscriptions
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourcePlanId, targetPlanId]
 *             properties:
 *               sourcePlanId: { type: string, format: uuid }
 *               targetPlanId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Migration sequence initiated
 */
router.post('/migrations', authenticate, requireSuperAdmin(), controller.initiateSubscriptionMigration);

// ─── Plan Core CRUD & Versioning ──────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: List all subscription plans
 *     description: Returns all available subscription plans in the system.
 *     operationId: listAllPlans
 *     tags: [Plans]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Plans list resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
 *
 *   post:
 *     summary: Create a plan draft (Super-Admin)
 *     description: |
 *       Creates a new plan draft version.
 *       **Required Role:** `Super Admin`
 *     operationId: createPlan
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string, example: "National Yearly" }
 *               price: { type: number, example: 299.99 }
 *     responses:
 *       201:
 *         description: Plan draft created
 */
router.get('/', authenticate, controller.listAllPlans);

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   get:
 *     summary: Get plan details by ID
 *     description: Retrieves details of a specific subscription plan.
 *     operationId: getPlanById
 *     tags: [Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Plan details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get('/:id', authenticate, controller.getPlanById);

router.post('/', authenticate, requireSuperAdmin(), controller.createPlan);

/**
 * @swagger
 * /api/v1/plans/{id}/versions:
 *   post:
 *     summary: Create new plan version draft (Super-Admin)
 *     description: |
 *       Initiates a new version draft for an existing plan.
 *       **Required Role:** `Super Admin`
 *     operationId: createPlanVersionDraft
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price: { type: number, example: 34.99 }
 *     responses:
 *       201:
 *         description: Version draft created
 */
router.post('/:id/versions', authenticate, requireSuperAdmin(), controller.createPlanVersionDraft);

/**
 * @swagger
 * /api/v1/plans/versions/{versionId}/submit:
 *   post:
 *     summary: Submit plan version for review (Super-Admin)
 *     description: |
 *       Submits plan version details for supervisor/admin review.
 *       **Required Role:** `Super Admin`
 *     operationId: submitPlanForReview
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: versionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Plan version submitted for review
 */
router.post('/versions/:versionId/submit', authenticate, requireSuperAdmin(), controller.submitPlanForReview);

/**
 * @swagger
 * /api/v1/plans/reviews/{reviewId}/assign:
 *   post:
 *     summary: Assign plan reviewer (Super-Admin)
 *     description: |
 *       Appoints reviewer to evaluate the plan version changes.
 *       **Required Role:** `Super Admin`
 *     operationId: assignPlanReviewer
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewerId]
 *             properties:
 *               reviewerId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reviewer assigned
 */
router.post('/reviews/:reviewId/assign', authenticate, requireSuperAdmin(), controller.assignPlanReviewer);

/**
 * @swagger
 * /api/v1/plans/reviews/{reviewId}/action:
 *   post:
 *     summary: Submit plan review decision (Super-Admin)
 *     description: |
 *       Approves or rejects a pending plan version.
 *       **Required Role:** `Super Admin`
 *     operationId: submitPlanReviewAction
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [APPROVE, REJECT] }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Review decision recorded
 */
router.post('/reviews/:reviewId/action', authenticate, requireSuperAdmin(), controller.submitPlanReviewAction);

/**
 * @swagger
 * /api/v1/plans/versions/{versionId}/publish:
 *   post:
 *     summary: Publish approved plan version (Super-Admin)
 *     description: |
 *       Publishes an approved plan version, making it the active version.
 *       **Required Role:** `Super Admin`
 *     operationId: publishPlanVersion
 *     tags: [Plans Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: versionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Version published successfully
 */
router.post('/versions/:versionId/publish', authenticate, requireSuperAdmin(), controller.publishPlanVersion);

export { router as plansRouter };
