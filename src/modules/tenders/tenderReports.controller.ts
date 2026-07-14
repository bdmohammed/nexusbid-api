import type { Request, Response } from "express";
import { AppDataSource } from "../../config/database";
import { TenderVersion } from "../../database/entities/TenderVersion";
import { Tender } from "../../database/entities/Tender";
import { TenderSubmission } from "../../database/entities/TenderSubmission";
import { TenderParticipant } from "../../database/entities/TenderParticipant";
import { logger } from "../../config/logger";

const tenderRepo = AppDataSource.getRepository(Tender);
const versionRepo = AppDataSource.getRepository(TenderVersion);
const submissionRepo = AppDataSource.getRepository(TenderSubmission);
const participantRepo = AppDataSource.getRepository(TenderParticipant);

export async function getBudgetReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const stats = await versionRepo
      .createQueryBuilder("tv")
      .leftJoinAndSelect("tv.category", "cat")
      .select("cat.name", "categoryName")
      .addSelect("SUM(tv.estimatedBudget)", "totalBudget")
      .addSelect("COUNT(tv.id)", "tenderCount")
      .groupBy("cat.name")
      .getRawMany();

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, "Error compiling budget report");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getStatusReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const stats = await tenderRepo
      .createQueryBuilder("t")
      .select("t.status", "status")
      .addSelect("t.publicationStatus", "publicationStatus")
      .addSelect("COUNT(t.id)", "count")
      .groupBy("t.status")
      .addGroupBy("t.publicationStatus")
      .getRawMany();

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, "Error compiling status report");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getVendorsReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const stats = await participantRepo
      .createQueryBuilder("tp")
      .select("tp.status", "status")
      .addSelect("COUNT(tp.id)", "count")
      .groupBy("tp.status")
      .getRawMany();

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, "Error compiling vendors report");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getPerformanceReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const submissionCount = await submissionRepo.count();
    const activeParticipants = await participantRepo.count();

    // Average time to submission, qualified vs rejected ratios
    res.json({
      success: true,
      data: {
        totalSubmissions: submissionCount,
        totalParticipants: activeParticipants,
        averageSubmissionsPerTender:
          activeParticipants > 0
            ? (submissionCount / activeParticipants).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error compiling performance report");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
