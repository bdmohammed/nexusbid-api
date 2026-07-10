import { appDataSource } from '../../config/database';
import { WebhookEvent } from '../../entities/WebhookEvent';
import { Subscription } from '../../entities/Subscription';
import { Transaction } from '../../entities/Transaction';
import { WebhookEventStatus, SubscriptionStatus, TransactionStatus, TransactionType } from '../../types/enums';
import { logger } from '../../config/logger';

const webhookEventRepository = appDataSource.getRepository(WebhookEvent);
const subscriptionRepository = appDataSource.getRepository(Subscription);
const transactionRepository = appDataSource.getRepository(Transaction);

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
      await webhookEventRepository.update(
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

  await subscriptionRepository.update(
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

  const subscription = await subscriptionRepository.findOne({ where: { paypalSubscriptionId } });
  if (!subscription) {
    logger.warn({ paypalSubscriptionId }, 'Subscription not found for cancellation event');
    return;
  }

  await subscriptionRepository.update(subscription.id, { status: SubscriptionStatus.CANCELLED });
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
  const subscription = await subscriptionRepository.findOne({
    where: { paypalSubscriptionId: billingAgreementId },
    relations: ['plan', 'planVersion'],
  });

  if (!subscription) {
    logger.warn({ billingAgreementId }, 'Subscription not found for PAYMENT.SALE.COMPLETED');
    return;
  }

  // Extend the subscription end date by plan duration
  const durationDays = subscription.planVersion?.durationDays || 30;
  const newEndDate = new Date(
    Math.max(subscription.endDate.getTime(), Date.now()) +
    durationDays * 24 * 60 * 60 * 1000,
  );
  await subscriptionRepository.update(subscription.id, {
    endDate: newEndDate,
    status: SubscriptionStatus.ACTIVE,
  });

  // Record transaction
  const amountCents = amount ? Math.round(parseFloat(amount.total) * 100) : 0;
  await transactionRepository.save(
    transactionRepository.create({
      userId: subscription.userId,
      amountCents,
      currency: amount?.currency?.toLowerCase() ?? 'usd',
      type: TransactionType.SUBSCRIPTION,
      referenceId: subscription.id,
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
  await subscriptionRepository.update(
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
  await transactionRepository.update(
    { paypalOrderId: orderId },
    {
      status: TransactionStatus.SUCCESS,
      paypalCaptureId: captureId,
      paypalResponse: resource as any,
    },
  );

  // Activate corresponding subscription if it exists
  const subscription = await subscriptionRepository.findOne({ where: { paypalOrderId: orderId } });
  if (subscription) {
    await subscriptionRepository.update(subscription.id, { status: SubscriptionStatus.ACTIVE });
    logger.info({ orderId, subId: subscription.id }, 'Activated subscription from capture');
  }
}

// ─── Log raw event (always first) ────────────────────────────────────────────

export async function logRawWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await webhookEventRepository.upsert(
    { provider, eventId, eventType, payload: payload as any, status: WebhookEventStatus.RECEIVED },
    { conflictPaths: ['provider', 'eventId'] },
  );
}

export async function isAlreadyProcessed(eventId: string): Promise<boolean> {
  const existing = await webhookEventRepository.findOne({
    where: { eventId, status: WebhookEventStatus.PROCESSED },
  });
  return existing !== null;
}

export async function markProcessing(eventId: string): Promise<void> {
  await webhookEventRepository.update({ eventId }, { status: WebhookEventStatus.PROCESSING });
}

export async function markProcessed(eventId: string): Promise<void> {
  await webhookEventRepository.update({ eventId }, {
    status: WebhookEventStatus.PROCESSED,
    processedAt: new Date(),
  });
}

export async function markFailed(eventId: string, error: string): Promise<void> {
  await webhookEventRepository.update({ eventId }, {
    status: WebhookEventStatus.FAILED,
    error,
  });
}
