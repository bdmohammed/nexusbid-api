import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';
import { Tender } from '../database/entities/Tender';
import { TenderLifecycleStatus, TenderPublicationStatus } from '../types/enums';

const tenderRepo = AppDataSource.getRepository(Tender);

/**
 * Expire/Close Tenders Job — runs hourly.
 * Sets publicationStatus = CLOSED for all ACTIVE/PUBLISHED tenders past their closing date.
 */
export async function expireTendersJob(): Promise<void> {
  const passedTenders = await tenderRepo
    .createQueryBuilder('tender')
    .leftJoinAndSelect('tender.activeVersion', 'activeVersion')
    .where('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE })
    .andWhere('tender.publicationStatus IN (:...pubStatuses)', {
      pubStatuses: [
        TenderPublicationStatus.PUBLISHED,
        TenderPublicationStatus.OPEN,
        TenderPublicationStatus.CLOSING,
      ],
    })
    .andWhere('activeVersion.closingDate < :now', { now: new Date() })
    .getMany();

  for await (const t of passedTenders) {
    t.publicationStatus = TenderPublicationStatus.CLOSED;
    await tenderRepo.save(t);
  }

  logger.info({ affected: passedTenders.length }, 'Expire/close tenders job complete');
}
