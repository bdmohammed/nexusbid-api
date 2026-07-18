import { AppDataSource } from '../config/database';
import { PurchasedTender } from '../database/entities/PurchasedTender';
import { Subscription } from '../database/entities/Subscription';
import { Tender } from '../database/entities/Tender';
import { SubscriptionStatus } from '../types/enums';

import type { TenderVersion } from '@/database/entities/TenderVersion';

const subscriptionRepository = AppDataSource.getRepository(Subscription);
const purchasedTenderRepository = AppDataSource.getRepository(PurchasedTender);
const tenderRepository = AppDataSource.getRepository(Tender);

/**
 * Determines if a user can access the full details and document of a tender.
 *
 * Access is granted if:
 *   1. The user has an ACTIVE subscription with a non-expired endDate matching the tender's target, OR
 *   2. The user has individually purchased this specific tender.
 *
 * Called server-side on EVERY tender detail and document download request.
 * Never trust client-supplied access claims.
 */
function checkCountryAccess(subscription: Subscription, version: TenderVersion): boolean {
  const versionCountry = version.state.country.code;
  const { targetCountry } = subscription;
  if (versionCountry && targetCountry) {
    return versionCountry.toLowerCase() === targetCountry.toLowerCase();
  }
  return false;
}

function checkBundleAccess(subscription: Subscription, version: TenderVersion): boolean {
  const categoryIds = subscription.selectedCategoryIds;
  const { categoryId } = version;
  if (categoryIds && categoryId) {
    return categoryIds.includes(categoryId);
  }
  return false;
}

function checkPlanAccess(
  planType: string,
  subscription: Subscription,
  version: TenderVersion,
): boolean {
  if (planType === 'all-access') {
    return true;
  }
  if (planType === 'state') {
    return subscription.targetStateId === version.stateId;
  }
  if (planType === 'country') {
    return checkCountryAccess(subscription, version);
  }
  if (planType === 'category') {
    return subscription.targetCategoryId === version.categoryId;
  }
  if (planType === 'bundle') {
    return checkBundleAccess(subscription, version);
  }
  return false;
}

async function checkPurchaseFallback(userId: string, tenderId: string): Promise<boolean> {
  const purchase = await purchasedTenderRepository.findOne({
    where: { userId, tenderId },
    select: ['id'],
  });
  return purchase !== null;
}

export async function hasAccessToTender(userId: string, tenderId: string): Promise<boolean> {
  // Check active subscriptions first (most common case)
  const activeSubscriptions = await subscriptionRepository.find({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['plan', 'planVersion', 'plan.activeVersion'],
  });

  const now = new Date();
  const validSubscriptions = activeSubscriptions.filter(
    (subscription) => subscription.endDate > now,
  );

  if (validSubscriptions.length === 0) {
    return checkPurchaseFallback(userId, tenderId);
  }

  // Fetch the tender details (category, state, state.country) to verify access
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: [
      'activeVersion',
      'activeVersion.state',
      'activeVersion.state.country',
      'activeVersion.category',
    ],
  });

  const version = tender?.activeVersion;
  if (!version) {
    return checkPurchaseFallback(userId, tenderId);
  }

  for (const subscription of validSubscriptions) {
    const { planVersion } = subscription;
    if (checkPlanAccess(planVersion.planType, subscription, version)) {
      return true;
    }
  }

  return checkPurchaseFallback(userId, tenderId);
}
