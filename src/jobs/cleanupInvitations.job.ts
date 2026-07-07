import { AppDataSource } from '../config/database';
import { TenderInvitation } from '../entities/TenderInvitation';
import { logger } from '../config/logger';

const invitationRepo = AppDataSource.getRepository(TenderInvitation);

export async function cleanupInvitationsJob(): Promise<void> {
  const expiredCount = await invitationRepo
    .createQueryBuilder()
    .update(TenderInvitation)
    .set({ status: 'EXPIRED' })
    .where('expires_at < :now', { now: new Date() })
    .andWhere("status = 'PENDING'")
    .execute();

  logger.info({ affected: expiredCount.affected || 0 }, 'Cleanup expired invitations job complete');
}
