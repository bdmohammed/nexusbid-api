import { appDataSource } from '../config/database';
import { logger } from '../config/logger';
import { TenderInvitation } from '../entities/TenderInvitation';

const invitationRepo = appDataSource.getRepository(TenderInvitation);

export async function cleanupInvitationsJob(): Promise<void> {
  const expiredCount = await invitationRepo
    .createQueryBuilder()
    .update(TenderInvitation)
    .set({ status: 'EXPIRED' })
    .where('expires_at < :now', { now: new Date() })
    .andWhere("status = 'PENDING'")
    .execute();

  logger.info({ affected: expiredCount.affected ?? 0 }, 'Cleanup expired invitations job complete');
}
