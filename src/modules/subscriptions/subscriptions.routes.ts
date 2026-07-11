import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';

import * as controller from './subscriptions.controller';
import { CreateSubscriptionDto } from './subscriptions.dto';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       required: [id, name, slug, price, interval, status]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *           example: "State-Wide Monthly"
 *         slug:
 *           type: string
 *           example: "state-wide-monthly"
 *         description:
 *           type: string
 *           example: "Access to all tenders in a single state"
 *         price:
 *           type: number
 *           example: 29.99
 *         currency:
 *           type: string
 *           example: "USD"
 *         interval:
 *           type: string
 *           enum: [month, year]
 *           example: "month"
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, ARCHIVED]
 *           example: "ACTIVE"
 *
 *     Subscription:
 *       type: object
 *       required: [id, userId, planId, status, price, currency]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         planId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           example: "ACTIVE"
 *         price:
 *           type: number
 *           example: 49.99
 *         currency:
 *           type: string
 *           example: "USD"
 *         paypalSubscriptionId:
 *           type: string
 *           nullable: true
 *           example: "I-ABC123XYZ"
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Get active subscription plans list (Public)
 *     description: Returns all active public plans configured in the system.
 *     operationId: getPublicPlans
 *     tags: [Subscriptions]
 *     security: []
 *     responses:
 *       200:
 *         description: Subscription plans list
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
 */
router.get('/plans', controller.getPlans);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Purchase or renew a subscription
 *     description: Creates a subscription and returns a PayPal checkout approval link.
 *     operationId: purchaseSubscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId, returnUrl, cancelUrl]
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://nexusbid.com/payment/success"
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://nexusbid.com/payment/cancel"
 *               targetStateId:
 *                 type: string
 *                 format: uuid
 *               targetCountry:
 *                 type: string
 *               targetCategoryId:
 *                 type: string
 *                 format: uuid
 *               selectedCategoryIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               couponCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subscription session created, approval URL resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         approvalUrl: { type: string, format: uri, example: "https://paypal.com/checkout?token=123" }
 *                         subscriptionId: { type: string, format: uuid }
 */
router.post('/', authenticate, validate(CreateSubscriptionDto), controller.createSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/me:
 *   get:
 *     summary: Get current user subscription details
 *     description: Resolves current subscription plan, pricing, and validity status.
 *     operationId: getMySubscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active subscription details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Subscription'
 *
 *   delete:
 *     summary: Cancel current active subscription
 *     description: Cancels recurring PayPal payments. User subscription will remain active until end of billing cycle.
 *     operationId: cancelMySubscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/me', authenticate, controller.getMySubscription);
router.delete('/me', authenticate, controller.cancelMySubscription);

export { router as subscriptionsRouter };
