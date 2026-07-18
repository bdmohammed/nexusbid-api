import { Router } from 'express';

import { validate } from '../../middleware/validate';

import { handlePayPalWebhook } from './webhooks.controller';
import { PayPalWebhookSchema } from './webhooks.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/webhooks/paypal:
 *   post:
 *     summary: Handle PayPal Webhook (Public Callback)
 *     description: |
 *       Receives events from PayPal (e.g. subscription activation, cancellation, payment capture).
 *       **Security:** Bypasses CSRF checking. Relies on internal PayPal signature
 *       verification headers to authenticate requests.
 *     operationId: handlePayPalWebhook
 *     tags: [Webhooks]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, event_type, resource]
 *             properties:
 *               id:
 *                 type: string
 *                 example: "WH-78901234567890XYZ"
 *               event_type:
 *                 type: string
 *                 example: "BILLING.SUBSCRIPTION.CANCELLED"
 *               resource:
 *                 type: object
 *                 description: Event-specific payload resource
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Webhook processed successfully"
 *               data: null
 *               traceId: "uuid"
 *       400:
 *         description: Invalid signature or payload structure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/paypal', validate(PayPalWebhookSchema, 'body'), handlePayPalWebhook);

export { router as webhooksRouter };
