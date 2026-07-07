import { AppDataSource } from '../config/database';
import { Subscription } from '../entities/Subscription';
import { PurchasedTender } from '../entities/PurchasedTender';
import { Tender } from '../entities/Tender';
import { SubscriptionStatus } from '../types/enums';

const subRepo = AppDataSource.getRepository(Subscription);
const purchasedRepo = AppDataSource.getRepository(PurchasedTender);
const tenderRepo = AppDataSource.getRepository(Tender);

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
  const activeSubs = await subRepo.find({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    relations: ['plan', 'planVersion', 'plan.activeVersion'],
  });

  const now = new Date();
  const validSubs = activeSubs.filter((sub) => sub.endDate > now);

  if (validSubs.length > 0) {
    // Fetch the tender details (category, state) to verify access
    const tender = await tenderRepo.findOne({
      where: { id: tenderId },
      relations: ['activeVersion', 'activeVersion.state', 'activeVersion.category'],
    });

    if (tender && tender.activeVersion) {
      const version = tender.activeVersion;
      for (const sub of validSubs) {
        const plan = sub.planVersion || sub.plan?.activeVersion;
        if (!plan) continue;

        // 1. All-Access Plan
        if (plan.planType === 'all-access') {
          return true;
        }

        // 2. State-Specific Plan
        if (plan.planType === 'state' && sub.targetStateId === version.stateId) {
          return true;
        }

        // 3. Country-Specific Plan
        if (
          plan.planType === 'country' &&
          sub.targetCountry &&
          version.state?.country &&
          version.state.country.toLowerCase() === sub.targetCountry.toLowerCase()
        ) {
          return true;
        }

        // 4. Category-Specific Plan
        if (plan.planType === 'category' && sub.targetCategoryId === version.categoryId) {
          return true;
        }

        // 5. Custom Bundle Plan (Pick 3/5/10/20 categories)
        if (
          plan.planType === 'bundle' &&
          sub.selectedCategoryIds &&
          version.categoryId &&
          sub.selectedCategoryIds.includes(version.categoryId)
        ) {
          return true;
        }
      }
    }
  }

  // Fall back to per-tender purchase
  const purchase = await purchasedRepo.findOne({
    where: { userId, tenderId },
    select: ['id'],
  });

  return purchase !== null;
}
