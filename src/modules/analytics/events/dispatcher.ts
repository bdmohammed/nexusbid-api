import { AppDataSource } from '../../../config/database';
import { logger } from '../../../config/logger';
import { AnalyticsEvent } from '../../../database/entities/AnalyticsEvent';
import { AnalyticsEventType } from '../../../types/enums';

const eventRepo = AppDataSource.getRepository(AnalyticsEvent);

export async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  actorId: string | null = null,
  entityType: string | null = null,
  entityId: string | null = null,
  properties: Record<string, string | number | boolean | null | undefined> = {},
): Promise<void> {
  // Execute asynchronously (non-blocking for HTTP requests)
  process.nextTick(async () => {
    try {
      const event = eventRepo.create({
        eventType,
        actorId,
        entityType,
        entityId,
        properties,
        occurredAt: new Date(),
      });
      await eventRepo.save(event);
    } catch (err) {
      logger.error({ err, eventType }, 'Failed to track analytics event');
    }
  });
}

// ─── Event Helpers ────────────────────────────────────────────────────────────

export function trackUserRegistered(
  userId: string,
  country: string,
  device: string,
  browser: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.USER_REGISTERED, userId, 'User', userId, {
    country,
    device,
    browser,
  });
}

export function trackUserVerified(userId: string): void {
  void trackAnalyticsEvent(AnalyticsEventType.USER_VERIFIED, userId, 'User', userId);
}

export function trackUserLoggedIn(userId: string, device: string, browser: string): void {
  void trackAnalyticsEvent(AnalyticsEventType.USER_LOGGED_IN, userId, 'User', userId, {
    device,
    browser,
  });
}

export function trackTenderCreated(
  tenderId: string,
  createdById: string,
  categoryId: string,
  tenderType: string,
  budget: number,
  country: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.TENDER_CREATED, createdById, 'Tender', tenderId, {
    categoryId,
    tenderType,
    budget,
    country,
  });
}

export function trackTenderPublished(
  tenderId: string,
  publisherId: string,
  categoryId: string,
  tenderType: string,
  budget: number,
  country: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.TENDER_PUBLISHED, publisherId, 'Tender', tenderId, {
    categoryId,
    tenderType,
    budget,
    country,
  });
}

export function trackTenderAwarded(
  tenderId: string,
  awarderId: string,
  winnerId: string,
  finalPrice: number,
  evaluationTimeSeconds: number,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.TENDER_AWARDED, awarderId, 'Tender', tenderId, {
    winnerId,
    finalPrice,
    evaluationTimeSeconds,
  });
}

export function trackSubscriptionCreated(
  userId: string,
  subscriptionId: string,
  planId: string,
  priceCents: number,
): void {
  void trackAnalyticsEvent(
    AnalyticsEventType.SUBSCRIPTION_CREATED,
    userId,
    'Subscription',
    subscriptionId,
    {
      planId,
      priceCents,
    },
  );
}

export function trackPaymentSuccessful(
  userId: string,
  transactionId: string,
  amountCents: number,
  currency: string,
  planId: string,
): void {
  void trackAnalyticsEvent(
    AnalyticsEventType.PAYMENT_SUCCESSFUL,
    userId,
    'Transaction',
    transactionId,
    {
      amountCents,
      currency,
      planId,
    },
  );
}

export function trackPaymentFailed(
  userId: string,
  transactionId: string,
  amountCents: number,
  currency: string,
  planId: string,
  error: string,
): void {
  void trackAnalyticsEvent(
    AnalyticsEventType.PAYMENT_FAILED,
    userId,
    'Transaction',
    transactionId,
    {
      amountCents,
      currency,
      planId,
      error,
    },
  );
}

export function trackTenderDownloaded(userId: string, tenderId: string, country: string): void {
  void trackAnalyticsEvent(AnalyticsEventType.TENDER_DOWNLOADED, userId, 'Tender', tenderId, {
    country,
  });
}

export function trackTenderViewed(
  userId: string | null,
  tenderId: string,
  country: string,
  device: string,
  browser: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.TENDER_VIEWED, userId, 'Tender', tenderId, {
    country,
    device,
    browser,
  });
}

export function trackPageView(
  userId: string | null,
  path: string,
  country: string,
  device: string,
  browser: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.PAGE_VIEW, userId, 'Page', null, {
    path,
    country,
    device,
    browser,
  });
}

export function trackSearch(
  userId: string | null,
  query: string,
  resultsCount: number,
  country: string,
): void {
  void trackAnalyticsEvent(AnalyticsEventType.SEARCH, userId, 'Search', null, {
    query,
    resultsCount,
    country,
  });
}
