import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';
import { Tender } from '../database/entities/Tender';
import { TenderLifecycleStatus, TenderPublicationStatus } from '../types/enums';

const tenderRepo = AppDataSource.getRepository(Tender);

export async function publishTendersJob(): Promise<void> {
  const pendingTenders = await tenderRepo
    .createQueryBuilder('tender')
    .leftJoinAndSelect('tender.activeVersion', 'activeVersion')
    .where('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE })
    .andWhere('tender.publicationStatus = :pubStatus', {
      pubStatus: TenderPublicationStatus.SCHEDULED,
    })
    .andWhere('activeVersion.openingDate <= :now', { now: new Date() })
    .getMany();

  for await (const t of pendingTenders) {
    t.publicationStatus = TenderPublicationStatus.OPEN;
    await tenderRepo.save(t);
  }

  logger.info({ affected: pendingTenders.length }, 'Publish scheduled tenders job complete');
}
