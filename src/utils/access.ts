import { appDataSource } from '../config/database';
import { Subscription } from '../entities/Subscription';
import { PurchasedTender } from '../entities/PurchasedTender';
import { Tender } from '../entities/Tender';
import { SubscriptionStatus } from '../types/enums';

const subscriptionRepository = appDataSource.getRepository(Subscription);
const purchasedTenderRepository = appDataSource.getRepository(PurchasedTender);
const tenderRepository = appDataSource.getRepository(Tender);

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
export async function hasAccessToTender(
  userId: string,
  tenderId: string,
): Promise<boolean> {
  // Check active subscriptions first (most common case)
  const activeSubscriptions = await subscriptionRepository.find({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['plan', 'planVersion', 'plan.activeVersion'],
  });

  const now = new Date();
  const validSubscriptions = activeSubscriptions.filter((subscription) => subscription.endDate > now);

  if (validSubscriptions.length > 0) {
    // Fetch the tender details (category, state) to verify access
    const tender = await tenderRepository.findOne({
      where: { id: tenderId },
      relations: ['activeVersion', 'activeVersion.state', 'activeVersion.category'],
    });

    if (tender && tender.activeVersion) {
      const version = tender.activeVersion;
      for (const subscription of validSubscriptions) {
        const plan = subscription.planVersion || subscription.plan?.activeVersion;
        if (!plan) continue;

        // 1. All-Access Plan
        if (plan.planType === 'all-access') {
          return true;
        }

        // 2. State-Specific Plan
        if (plan.planType === 'state' && subscription.targetStateId === version.stateId) {
          return true;
        }

        // 3. Country-Specific Plan
        if (
          plan.planType === 'country' &&
          subscription.targetCountry &&
          version.state?.country &&
          version.state.country.toLowerCase() === subscription.targetCountry.toLowerCase()
        ) {
          return true;
        }

        // 4. Category-Specific Plan
        if (plan.planType === 'category' && subscription.targetCategoryId === version.categoryId) {
          return true;
        }

        // 5. Custom Bundle Plan (Pick 3/5/10/20 categories)
        if (
          plan.planType === 'bundle' &&
          subscription.selectedCategoryIds &&
          version.categoryId &&
          subscription.selectedCategoryIds.includes(version.categoryId)
        ) {
          return true;
        }
      }
    }
  }

  // Fall back to per-tender purchase
  const purchase = await purchasedTenderRepository.findOne({
    where: { userId, tenderId },
    select: ['id'],
  });

  return purchase !== null;
}
