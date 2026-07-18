import { performance } from 'node:perf_hooks';

import { logger } from '../../config/logger';
import { asyncHandler } from '../../core/asyncHandler';
import { getPayPalEventId, verifyPayPalWebhook } from '../../services/paypal/paypal.webhook';
import { WebhookEventType, WebhookProvider } from '../../types/enums';

import * as service from './webhooks.service';

import type { PayPalWebhookDto } from './webhooks.dto';

/**
 * POST /api/v1/webhooks/paypal
 *
 * PayPal webhook handler — implements the safety-first pattern:
 *   1. Log raw event FIRST (before any processing or validation)
 *   2. Verify PayPal signature
 *   3. Check idempotency (already processed?)
 *   4. Mark as processing
 *   5. Process the event
 *   6. Mark as processed (or failed)
 *   7. Always return 200 to stop PayPal retries
 *
 * CSRF is NOT applied to this route (PayPal can't send CSRF tokens).
 */
export const handlePayPalWebhook = asyncHandler<{}, { received: boolean }, PayPalWebhookDto>(
  async (req, res) => {
    const startTime = performance.now();
    const eventId = getPayPalEventId(req);
    const eventTypeRaw = req.body.event_type;
    const eventType = Object.values(WebhookEventType).includes(eventTypeRaw as WebhookEventType)
      ? (eventTypeRaw as WebhookEventType)
      : WebhookEventType.UNKNOWN;

    const { resource } = req.body;
    const resourceId = resource.id;
    const billingAgreementId = resource.billing_agreement_id;

    const paypalSubscriptionId = resourceId?.startsWith('I-')
      ? resourceId
      : (billingAgreementId ?? undefined);
    const paypalOrderId = billingAgreementId ? undefined : (resourceId ?? undefined);

    logger.info(
      { eventId, eventType, paypalSubscriptionId, paypalOrderId },
      'PayPal webhook received',
    );

    // ── Step 1: Log raw event FIRST — before ANY validation ────────────────────
    await service.logRawWebhookEvent(WebhookProvider.PAYPAL, eventId, eventType, req.body);

    // ── Step 2: Verify signature ────────────────────────────────────────────────
    const startVerify = performance.now();
    const isValid = await verifyPayPalWebhook(req);
    const verifyDurationMs = performance.now() - startVerify;

    if (!isValid) {
      await service.markFailed(eventId, 'Invalid PayPal webhook signature');
      logger.warn(
        { eventId, eventType, paypalSubscriptionId, paypalOrderId, durationMs: verifyDurationMs },
        'PayPal webhook signature invalid',
      );
      // Return 200 to prevent PayPal from retrying an invalid signature
      return res.status(200).json({ received: true });
    }

    logger.info(
      { eventId, eventType, paypalSubscriptionId, paypalOrderId, durationMs: verifyDurationMs },
      'PayPal webhook signature verified',
    );

    // ── Step 3: Idempotency check ───────────────────────────────────────────────
    const alreadyProcessed = await service.isAlreadyProcessed(eventId);
    if (alreadyProcessed) {
      logger.info(
        { eventId, eventType, paypalSubscriptionId, paypalOrderId },
        'Duplicate PayPal webhook — ignoring',
      );
      return res.status(200).json({ received: true });
    }

    // ── Step 4: Mark as processing ──────────────────────────────────────────────
    await service.markProcessing(eventId);

    // ── Step 5: Process the event ───────────────────────────────────────────────
    try {
      await service.processWebhookEvent(req.body);
      // ── Step 6a: Mark as processed ──────────────────────────────────────────
      await service.markProcessed(eventId);

      const durationMs = performance.now() - startTime;
      logger.info(
        { eventId, eventType, paypalSubscriptionId, paypalOrderId, durationMs },
        'PayPal webhook processed successfully',
      );
    } catch (err) {
      // ── Step 6b: Mark as failed — but DO NOT throw ──────────────────────────
      const errorMessage = err instanceof Error ? err.message : String(err);
      await service.markFailed(eventId, errorMessage);

      const durationMs = performance.now() - startTime;
      logger.error(
        { err, eventId, eventType, paypalSubscriptionId, paypalOrderId, durationMs },
        'PayPal webhook processing error',
      );
      // Fall through — return 200 anyway (event is logged, can replay later)
    }

    // ── Step 7: Always return 200 ───────────────────────────────────────────────
    return res.status(200).json({ received: true });
  },
);
