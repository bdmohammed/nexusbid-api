import { Router } from 'express';

import { authenticate } from '../../../middleware/authenticate';
import { loadPermissions, requirePermission } from '../../../middleware/permissions';
import { validate } from '../../../middleware/validate';
import { PatchLayoutSchema } from '../dto/dashboard.dto';

import * as controller from './dashboard.controller';

const router = Router();

// Guard all dashboard routes with authentication & permission loading
router.use(authenticate);
router.use(loadPermissions);

/**
 * @swagger
 * /api/v1/dashboard/config:
 *   get:
 *     summary: Get dashboard layout configuration
 *     description: |
 *       Retrieves the current user's customized layout order, widget sizes, and visibility settings.
 *       **Required Permission:** `dashboard.view`
 *     operationId: getDashboardConfig
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard configuration resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 */
router.get('/config', requirePermission('dashboard.view'), controller.getConfig);

/**
 * @swagger
 * /api/v1/dashboard/stream:
 *   get:
 *     summary: Stream dashboard updates (SSE)
 *     description: |
 *       Initializes a Server-Sent Events (SSE) stream for real-time dashboard data updates (counters, logs, alerts).
 *       **Required Permission:** `dashboard.view`
 *     operationId: streamDashboardUpdates
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: SSE connection established
 *         headers:
 *           Content-Type:
 *             schema: { type: string, example: "text/event-stream" }
 *           Cache-Control:
 *             schema: { type: string, example: "no-cache" }
 *           Connection:
 *             schema: { type: string, example: "keep-alive" }
 */
router.get('/stream', requirePermission('dashboard.view'), controller.streamDashboardUpdates);

/**
 * @swagger
 * /api/v1/dashboard/tenders:
 *   get:
 *     summary: Get dashboard tender statistics
 *     description: |
 *       Resolves aggregate metrics for tenders (drafts, active, closing, completed).
 *       **Required Permission:** `tender.view`
 *     operationId: getTenderStats
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tender statistics resolved
 */
router.get('/tenders', requirePermission('tender.view'), controller.getTenderStats);

/**
 * @swagger
 * /api/v1/dashboard/revenue:
 *   get:
 *     summary: Get dashboard revenue statistics
 *     description: |
 *       Resolves aggregate metrics for revenue, payments, and subscriptions.
 *       **Required Permission:** `subscription.view`
 *     operationId: getRevenueStats
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Revenue stats resolved
 */
router.get('/revenue', requirePermission('subscription.view'), controller.getRevenueStats);

/**
 * @swagger
 * /api/v1/dashboard/users:
 *   get:
 *     summary: Get dashboard user growth and activity statistics
 *     description: |
 *       Resolves aggregate metrics for users (registrations, active, categories distribution).
 *       **Required Permission:** `user.view`
 *     operationId: getUsersStats
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User stats resolved
 */
router.get('/users', requirePermission('user.view'), controller.getUsersStats);

/**
 * @swagger
 * /api/v1/dashboard/review-queue:
 *   get:
 *     summary: Get dashboard tender and plan review queue
 *     description: |
 *       Resolves items currently awaiting admin or supervisor review/action.
 *       **Required Permission:** `rbac.view`
 *     operationId: getReviewQueue
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Review queue items resolved
 */
router.get('/review-queue', requirePermission('rbac.view'), controller.getReviewQueue);

/**
 * @swagger
 * /api/v1/dashboard/alerts:
 *   get:
 *     summary: Get dashboard critical system alerts
 *     description: |
 *       Resolves list of pending critical system, database, or subscription alerts.
 *       **Required Permission:** `dashboard.view`
 *     operationId: getCriticalAlerts
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Critical alerts list resolved
 */
router.get('/alerts', requirePermission('dashboard.view'), controller.getCriticalAlerts);

/**
 * @swagger
 * /api/v1/dashboard/recent-activity:
 *   get:
 *     summary: Get dashboard recent audit activity
 *     description: |
 *       Resolves brief list of recent audit logs and actions.
 *       **Required Permission:** `audit.view`
 *     operationId: getRecentActivity
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recent activity resolved
 */
router.get('/recent-activity', requirePermission('audit.view'), controller.getRecentActivity);

/**
 * @swagger
 * /api/v1/dashboard/system-health:
 *   get:
 *     summary: Get system health telemetry metrics
 *     description: |
 *       Resolves cpu, memory, database latency, and storage metrics.
 *       **Required Permission:** `system.view`
 *     operationId: getSystemHealth
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System telemetry resolved
 */
router.get('/system-health', requirePermission('system.view'), controller.getSystemHealth);

/**
 * @swagger
 * /api/v1/dashboard/quick-actions:
 *   get:
 *     summary: Get dashboard quick actions menu
 *     description: |
 *       Resolves action shortcuts authorized for the current user's permissions.
 *       **Required Permission:** `dashboard.view`
 *     operationId: getQuickActionsList
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Quick actions resolved
 */
router.get('/quick-actions', requirePermission('dashboard.view'), controller.getQuickActionsList);

/**
 * @swagger
 * /api/v1/dashboard/layout:
 *   patch:
 *     summary: Update dashboard layout order/widgets configuration
 *     description: |
 *       Saves custom widget layout arrangement for the user.
 *       **Required Permission:** `dashboard.view`
 *     operationId: updateLayout
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [layout]
 *             properties:
 *               layout:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Layout configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch(
  '/layout',
  requirePermission('dashboard.view'),
  validate(PatchLayoutSchema, 'body'),
  controller.updateLayout,
);

/**
 * @swagger
 * /api/v1/dashboard/layout/reset:
 *   post:
 *     summary: Reset dashboard layout to system default
 *     description: |
 *       Reverts dashboard widgets config to standard layout.
 *       **Required Permission:** `dashboard.view`
 *     operationId: resetLayout
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Layout reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/layout/reset', requirePermission('dashboard.view'), controller.resetLayout);

export { router as dashboardRouter };
