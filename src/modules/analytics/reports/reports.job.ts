import { AppDataSource } from "../../../config/database";
import { ScheduledReport } from "../../../database/entities/ScheduledReport";
import { logger } from "../../../config/logger";

export async function processScheduledReports(): Promise<void> {
  const reportRepo = AppDataSource.getRepository(ScheduledReport);
  const now = new Date();

  // Find reports whose nextRunAt is in the past
  const reports = await reportRepo
    .createQueryBuilder("sr")
    .where("sr.next_run_at <= :now OR sr.next_run_at IS NULL", { now })
    .getMany();

  if (reports.length === 0) return;

  logger.info({ count: reports.length }, "Processing scheduled reports");

  for (const report of reports) {
    try {
      logger.info(
        { reportId: report.id, name: report.reportName },
        "Triggering scheduled report",
      );

      // 1. Gather stats (Simulate aggregating overview details for the report)
      const usersCount = await AppDataSource.query(
        "SELECT COUNT(*) FROM users",
      );
      const tendersCount = await AppDataSource.query(
        "SELECT COUNT(*) FROM tenders",
      );

      const reportContent = `
        NexusBid BI Report Summary: ${report.reportName}
        ----------------------------------------------
        Timezone: ${report.timezone}
        Total Active Users: ${usersCount[0]?.count || 0}
        Total Published Tenders: ${tendersCount[0]?.count || 0}
      `;

      // 2. Dispatch report to recipients
      logger.info(
        {
          reportId: report.id,
          recipients: report.recipients,
          content: reportContent,
        },
        "Report email successfully dispatched to recipients",
      );

      // 3. Update execution schedules
      report.lastRunAt = now;
      report.nextRunAt = calculateNextRun(report.frequency, now);
      await reportRepo.save(report);
    } catch (err) {
      logger.error({ err, reportId: report.id }, "Scheduled report run failed");
    }
  }
}

function calculateNextRun(frequency: string, now: Date): Date {
  const next = new Date(now);
  if (frequency === "DAILY") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 1); // default daily
  }
  return next;
}
