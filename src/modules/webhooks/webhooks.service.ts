import { AppDataSource } from '../../config/database';
import { WebhookEvent } from '../../entities/WebhookEvent';
import { Subscription } from '../../entities/Subscription';
import { Transaction } from '../../entities/Transaction';
import { WebhookEventStatus, SubscriptionStatus, TransactionStatus, TransactionType } from '../../types/enums';
import { logger } from '../../config/logger';

const webhookRepo = AppDataSource.getRepository(WebhookEvent);
const subRepo = AppDataSource.getRepository(Subscription);
const txnRepo = AppDataSource.getRepository(Transaction);

type PayPalWebhookBody = {
  event_type: string;
  resource: Record<string, unknown>;
};

// ─── Core webhook processing ──────────────────────────────────────────────────

export async function processWebhookEvent(body: PayPalWebhookBody): Promise<void> {
  const { event_type: eventType, resource } = body;
  logger.info({ eventType }, 'Processing PayPal webhook event');

  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await handleSubscriptionActivated(resource);
      break;

    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      await handleSubscriptionCancelledOrExpired(resource);
      break;

    case 'PAYMENT.SALE.COMPLETED':
      await handleSaleCompleted(resource);
      break;

    case 'PAYMENT.SALE.DENIED':
      await handleSaleDenied(resource);
      break;

    case 'PAYMENT.CAPTURE.COMPLETED':
      await handleCaptureCompleted(resource);
      break;

    default:
      // Log as ignored — not an error
      await webhookRepo.update(
        { eventId: body['id' as keyof typeof body] as string },
        { status: WebhookEventStatus.IGNORED },
      );
      logger.info({ eventType }, 'Unhandled PayPal event type — ignored');
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleSubscriptionActivated(
  resource: Record<string, unknown>,
): Promise<void> {
  const paypalSubscriptionId = resource['id'] as string;
  if (!paypalSubscriptionId) return;

  await subRepo.update(
    { paypalSubscriptionId },
    { status: SubscriptionStatus.ACTIVE },
  );

  logger.info({ paypalSubscriptionId }, 'Subscription activated');
}

async function handleSubscriptionCancelledOrExpired(
  resource: Record<string, unknown>,
): Promise<void> {
  const paypalSubscriptionId = resource['id'] as string;
  if (!paypalSubscriptionId) return;

  const sub = await subRepo.findOne({ where: { paypalSubscriptionId } });
  if (!sub) {
    logger.warn({ paypalSubscriptionId }, 'Subscription not found for cancellation event');
    return;
  }

  await subRepo.update(sub.id, { status: SubscriptionStatus.CANCELLED });
  logger.info({ paypalSubscriptionId }, 'Subscription marked cancelled/expired');
}

async function handleSaleCompleted(
  resource: Record<string, unknown>,
): Promise<void> {
  // PAYMENT.SALE.COMPLETED fires for recurring subscription renewal payments
  const billingAgreementId = resource['billing_agreement_id'] as string;
  const saleId = resource['id'] as string;
  const amount = resource['amount'] as { total: string; currency: string } | undefined;

  if (!billingAgreementId) return;

  // Find the subscription
  const sub = await subRepo.findOne({
    where: { paypalSubscriptionId: billingAgreementId },
    relations: ['plan', 'planVersion'],
  });

  if (!sub) {
    logger.warn({ billingAgreementId }, 'Subscription not found for PAYMENT.SALE.COMPLETED');
    return;
  }

  // Extend the subscription end date by plan duration
  const durationDays = sub.planVersion?.durationDays || 30;
  const newEndDate = new Date(
    Math.max(sub.endDate.getTime(), Date.now()) +
    durationDays * 24 * 60 * 60 * 1000,
  );
  await subRepo.update(sub.id, {
    endDate: newEndDate,
    status: SubscriptionStatus.ACTIVE,
  });

  // Record transaction
  const amountCents = amount ? Math.round(parseFloat(amount.total) * 100) : 0;
  await txnRepo.save(
    txnRepo.create({
      userId: sub.userId,
      amountCents,
      currency: amount?.currency?.toLowerCase() ?? 'usd',
      type: TransactionType.SUBSCRIPTION,
      referenceId: sub.id,
      paypalOrderId: saleId,
      paypalCaptureId: saleId,
      status: TransactionStatus.SUCCESS,
      paypalResponse: resource,
    }),
  );

  logger.info({ billingAgreementId, saleId }, 'Recurring payment recorded');
}

async function handleSaleDenied(
  resource: Record<string, unknown>,
): Promise<void> {
  const billingAgreementId = resource['billing_agreement_id'] as string;
  if (!billingAgreementId) return;

  // Mark subscription as expired on payment failure
  await subRepo.update(
    { paypalSubscriptionId: billingAgreementId },
    { status: SubscriptionStatus.EXPIRED },
  );

  logger.warn({ billingAgreementId }, 'Subscription payment denied — marked expired');
}

async function handleCaptureCompleted(
  resource: Record<string, unknown>,
): Promise<void> {
  // PAYMENT.CAPTURE.COMPLETED fires for one-time Orders API captures
  const captureId = resource['id'] as string;
  // Get the order ID from supplementary_data or capture resource if available
  const orderId = (resource['supplementary_data'] as Record<string, unknown>)?.['related_ids'] as string ?? captureId;
  const amount = resource['amount'] as { value: string; currency_code: string } | undefined;

  logger.info({ captureId, orderId }, 'One-time capture completed');

  // Update transaction status if it exists
  await txnRepo.update(
    { paypalOrderId: orderId },
    {
      status: TransactionStatus.SUCCESS,
      paypalCaptureId: captureId,
      paypalResponse: resource as any,
    },
  );

  // Activate corresponding subscription if it exists
  const sub = await subRepo.findOne({ where: { paypalOrderId: orderId } });
  if (sub) {
    await subRepo.update(sub.id, { status: SubscriptionStatus.ACTIVE });
    logger.info({ orderId, subId: sub.id }, 'Activated subscription from capture');
  }
}

// ─── Log raw event (always first) ────────────────────────────────────────────

export async function logRawWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await webhookRepo.upsert(
    { provider, eventId, eventType, payload: payload as any, status: WebhookEventStatus.RECEIVED },
    { conflictPaths: ['provider', 'eventId'] },
  );
}

export async function isAlreadyProcessed(eventId: string): Promise<boolean> {
  const existing = await webhookRepo.findOne({
    where: { eventId, status: WebhookEventStatus.PROCESSED },
  });
  return existing !== null;
}

export async function markProcessing(eventId: string): Promise<void> {
  await webhookRepo.update({ eventId }, { status: WebhookEventStatus.PROCESSING });
}

export async function markProcessed(eventId: string): Promise<void> {
  await webhookRepo.update({ eventId }, {
    status: WebhookEventStatus.PROCESSED,
    processedAt: new Date(),
  });
}

export async function markFailed(eventId: string, error: string): Promise<void> {
  await webhookRepo.update({ eventId }, {
    status: WebhookEventStatus.FAILED,
    error,
  });
}
