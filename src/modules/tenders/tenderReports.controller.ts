import { AppDataSource } from '../../config/database';
import { asyncHandler } from '../../core/asyncHandler';
import { sendOk } from '../../core/response';
import { Tender } from '../../database/entities/Tender';
import { TenderParticipant } from '../../database/entities/TenderParticipant';
import { TenderSubmission } from '../../database/entities/TenderSubmission';
import { TenderVersion } from '../../database/entities/TenderVersion';

const tenderRepository = AppDataSource.getRepository(Tender);
const tenderVersionRepository = AppDataSource.getRepository(TenderVersion);
const tenderSubmissionRepository = AppDataSource.getRepository(TenderSubmission);
const tenderParticipantRepository = AppDataSource.getRepository(TenderParticipant);

export const getBudgetReport = asyncHandler(async (_req, res) => {
  const budgetStatistics = await tenderVersionRepository
    .createQueryBuilder('tv')
    .leftJoinAndSelect('tv.category', 'cat')
    .select('cat.name', 'categoryName')
    .addSelect('SUM(tv.estimatedBudget)', 'totalBudget')
    .addSelect('COUNT(tv.id)', 'tenderCount')
    .groupBy('cat.name')
    .getRawMany();

  return sendOk(res, budgetStatistics);
});

export const getStatusReport = asyncHandler(async (_req, res) => {
  const statusStatistics = await tenderRepository
    .createQueryBuilder('t')
    .select('t.status', 'status')
    .addSelect('t.publicationStatus', 'publicationStatus')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('t.status')
    .addGroupBy('t.publicationStatus')
    .getRawMany();

  return sendOk(res, statusStatistics);
});

export const getVendorsReport = asyncHandler(async (_req, res) => {
  const vendorStatistics = await tenderParticipantRepository
    .createQueryBuilder('tp')
    .select('tp.status', 'status')
    .addSelect('COUNT(tp.id)', 'count')
    .groupBy('tp.status')
    .getRawMany();

  return sendOk(res, vendorStatistics);
});

export const getPerformanceReport = asyncHandler(async (_req, res) => {
  const submissionCount = await tenderSubmissionRepository.count();
  const activeParticipants = await tenderParticipantRepository.count();

  return sendOk(res, {
    totalSubmissions: submissionCount,
    totalParticipants: activeParticipants,
    averageSubmissionsPerTender:
      activeParticipants > 0 ? (submissionCount / activeParticipants).toFixed(2) : 0,
  });
});
