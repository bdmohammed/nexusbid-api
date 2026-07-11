import { appDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { Tender } from '../../entities/Tender';
import { TenderParticipant } from '../../entities/TenderParticipant';
import { TenderSubmission } from '../../entities/TenderSubmission';
import { TenderVersion } from '../../entities/TenderVersion';

import type { Request, Response } from 'express';

const tenderRepository = appDataSource.getRepository(Tender);
const tenderVersionRepository = appDataSource.getRepository(TenderVersion);
const tenderSubmissionRepository = appDataSource.getRepository(TenderSubmission);
const tenderParticipantRepository = appDataSource.getRepository(TenderParticipant);

export async function getBudgetReport(req: Request, res: Response): Promise<void> {
  try {
    const budgetStatistics = await tenderVersionRepository
      .createQueryBuilder('tv')
      .leftJoinAndSelect('tv.category', 'cat')
      .select('cat.name', 'categoryName')
      .addSelect('SUM(tv.estimatedBudget)', 'totalBudget')
      .addSelect('COUNT(tv.id)', 'tenderCount')
      .groupBy('cat.name')
      .getRawMany();

    res.json({ success: true, data: budgetStatistics });
  } catch (error) {
    logger.error({ error }, 'Error compiling budget report');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getStatusReport(req: Request, res: Response): Promise<void> {
  try {
    const statusStatistics = await tenderRepository
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('t.publicationStatus', 'publicationStatus')
      .addSelect('COUNT(t.id)', 'count')
      .groupBy('t.status')
      .addGroupBy('t.publicationStatus')
      .getRawMany();

    res.json({ success: true, data: statusStatistics });
  } catch (error) {
    logger.error({ error }, 'Error compiling status report');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getVendorsReport(req: Request, res: Response): Promise<void> {
  try {
    const vendorStatistics = await tenderParticipantRepository
      .createQueryBuilder('tp')
      .select('tp.status', 'status')
      .addSelect('COUNT(tp.id)', 'count')
      .groupBy('tp.status')
      .getRawMany();

    res.json({ success: true, data: vendorStatistics });
  } catch (error) {
    logger.error({ error }, 'Error compiling vendors report');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getPerformanceReport(req: Request, res: Response): Promise<void> {
  try {
    const submissionCount = await tenderSubmissionRepository.count();
    const activeParticipants = await tenderParticipantRepository.count();

    // Average time to submission, qualified vs rejected ratios
    res.json({
      success: true,
      data: {
        totalSubmissions: submissionCount,
        totalParticipants: activeParticipants,
        averageSubmissionsPerTender:
          activeParticipants > 0 ? (submissionCount / activeParticipants).toFixed(2) : 0,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error compiling performance report');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
