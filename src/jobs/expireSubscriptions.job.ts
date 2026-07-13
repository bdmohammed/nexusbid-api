import { AppDataSource } from "../config/database";
import { Subscription } from "../database/entities/Subscription";
import { SubscriptionStatus } from "../types/enums";
import { logger } from "../config/logger";

const subRepo = AppDataSource.getRepository(Subscription);

/**
 * Expire Subscriptions Job — runs hourly.
 * Sets status = EXPIRED for all ACTIVE subscriptions past their end date.
 *
 * Uses a single bulk UPDATE query for efficiency.
 */
export async function expireSubscriptionsJob(): Promise<void> {
  const result = await subRepo
    .createQueryBuilder()
    .update(Subscription)
    .set({ status: SubscriptionStatus.EXPIRED })
    .where("status = :status", { status: SubscriptionStatus.ACTIVE })
    .andWhere('"endDate" < :now', { now: new Date() })
    .execute();

  logger.info(
    { affected: result.affected },
    "Expire subscriptions job: subscriptions expired",
  );
}
