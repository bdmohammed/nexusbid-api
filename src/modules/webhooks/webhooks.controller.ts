import { performance } from 'node:perf_hooks';

import { logger } from '../../config/logger';
import { asyncHandler } from '../../core/asyncHandler';
import { getPayPalEventId, verifyPayPalWebhook } from '../../services/paypal/paypal.webhook';

import * as service from './webhooks.service';

import type { Request, Response } from 'express';

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
export const handlePayPalWebhook = asyncHandler(async (req: Request, res: Response) => {
  const startTime = performance.now();
  const eventId = getPayPalEventId(req);
  const eventType = ((req.body as Record<string, unknown>)['event_type'] as string) ?? 'UNKNOWN';

  const resource = (req.body as Record<string, any>).resource ?? {};
  const paypalSubscriptionId = resource.id?.startsWith('I-')
    ? resource.id
    : (resource.billing_agreement_id ?? undefined);
  const paypalOrderId = resource.billing_agreement_id ? undefined : (resource.id ?? undefined);

  logger.info(
    { eventId, eventType, paypalSubscriptionId, paypalOrderId },
    'PayPal webhook received',
  );

  // ── Step 1: Log raw event FIRST — before ANY validation ────────────────────
  await service.logRawWebhookEvent(
    'paypal',
    eventId,
    eventType,
    req.body as Record<string, unknown>,
  );

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
    await service.processWebhookEvent(
      req.body as { event_type: string; resource: Record<string, unknown> },
    );
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
});
