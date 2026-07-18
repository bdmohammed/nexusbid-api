import { AppDataSource } from '../../../config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../../core/AppError';
import { AnalyticsAlert } from '../../../database/entities/AnalyticsAlert';
import { ExportJob } from '../../../database/entities/ExportJob';
import { ScheduledReport } from '../../../database/entities/ScheduledReport';
import { ScheduledReportRecipient } from '../../../database/entities/ScheduledReportRecipient';
import { TenderDailyMetrics } from '../../../database/entities/TenderDailyMetrics';
import { UserDailyMetrics } from '../../../database/entities/UserDailyMetrics';
import { UserDashboardLayout } from '../../../database/entities/UserDashboardLayout';
import {
  DashboardTheme,
  ExportFormat,
  ExportJobStatus,
  RecipientType,
  ReportFormat,
  ReportType,
} from '../../../types/enums';
import { getFromCache, setToCache } from '../cache/redis';
import { MetricFormulas } from '../metrics/formulas';

import type { DashboardWidget } from '../../../database/entities/UserDashboardLayout';
import type { ExportJobType, ReportFrequency } from '../../../types/enums';
import type {
  AnalyticsQueryDto,
  CreateScheduledReportDto,
  SaveDashboardLayoutDto,
} from '../dto/analytics.dto';

export interface OverviewStats {
  totalTenders: number;
  openTenders: number;
  awardedTenders: number;
  totalBudget: number;
  mrr: number | string;
  arr: number | string;
  conversionRate: number | string;
  bidSuccessRate: number | string;
  churnRate: number | string;
  arpu: number | string;
  ltv: number | string;
}

export interface TenderMetricRow {
  date: Date;
  created: number;
  published: number;
  awarded: number;
  budget: number;
}

export interface CategoryMetricRow {
  name: string;
  tender_count: number;
  total_budget: number;
}

export interface RevenueMetricRow {
  date: Date;
  revenue_cents: number;
  active_subscriptions: number;
}

export interface SystemPerformanceMetrics {
  apiResponseTimeMs: number;
  databaseQueriesPerSecond: number;
  backgroundJobsQueueLength: number;
  failedJobsCount: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  cacheHitRatio: number;
  storageUsedBytes: number;
}

// ─── Overview metrics ────────────────────────────────────────────────────────

export async function getOverviewStats(dto: AnalyticsQueryDto): Promise<OverviewStats> {
  const cacheKey = `analytics:overview:${JSON.stringify(dto)}`;
  const cached = await getFromCache<OverviewStats>(cacheKey);
  if (cached) return cached;

  const tenderMetrics = AppDataSource.getRepository(TenderDailyMetrics);
  const qb = tenderMetrics
    .createQueryBuilder('m')
    .select('SUM(m.created_count)', 'created')
    .addSelect('SUM(m.published_count)', 'published')
    .addSelect('SUM(m.awarded_count)', 'awarded')
    .addSelect('SUM(m.total_budget)', 'totalBudget')
    .addSelect('SUM(m.bid_count)', 'bids');

  if (dto.from) qb.andWhere('m.date >= :from', { from: dto.from });
  if (dto.to) qb.andWhere('m.date <= :to', { to: dto.to });
  if (dto.country) qb.andWhere('m.country = :country', { country: dto.country });

  const raw = await qb.getRawOne();

  // Combine with calculated metrics formulas
  const data = {
    totalRevenue: 245000, // mock revenue sum
    activeMonthlyRevenueCents: 12500000,
    uniqueVisitors: 45000,
    bidsSubmitted: parseInt(raw?.bids ?? '0', 10),
    bidsAwarded: parseInt(raw?.awarded ?? '0', 10),
    activeSubscribers: 420,
    cancelledThisMonth: 12,
    activeUsers: 850,
    revenueCents: 24500000,
    tendersCreated: parseInt(raw?.created ?? '0', 10),
    tendersPublished: parseInt(raw?.published ?? '0', 10),
    totalBudget: parseFloat(raw?.totalBudget ?? '0.00'),
  };

  const results: OverviewStats = {
    totalTenders: data.tendersCreated,
    openTenders: data.tendersPublished,
    awardedTenders: data.bidsAwarded,
    totalBudget: data.totalBudget,
    mrr: MetricFormulas.mrr?.calculate(data) ?? 0,
    arr: MetricFormulas.arr?.calculate(data) ?? 0,
    conversionRate: MetricFormulas.conversion_rate?.calculate(data) ?? 0,
    bidSuccessRate: MetricFormulas.bid_success_rate?.calculate(data) ?? 0,
    churnRate: MetricFormulas.churn_rate?.calculate(data) ?? 0,
    arpu: MetricFormulas.arpu?.calculate(data) ?? 0,
    ltv: MetricFormulas.ltv?.calculate(data) ?? 0,
  };

  await setToCache(cacheKey, results, 300); // 5 minutes TTL
  return results;
}

// ─── Tenders analytics ───────────────────────────────────────────────────────

export async function getTenderAnalytics(dto: AnalyticsQueryDto): Promise<TenderMetricRow[]> {
  const cacheKey = `analytics:tenders:${JSON.stringify(dto)}`;
  const cached = await getFromCache<TenderMetricRow[]>(cacheKey);
  if (cached) return cached;

  const results: TenderMetricRow[] = await AppDataSource.query(
    `
    SELECT
      date,
      SUM(created_count)::int AS created,
      SUM(published_count)::int AS published,
      SUM(awarded_count)::int AS awarded,
      SUM(total_budget)::numeric AS budget
    FROM tender_daily_metrics
    WHERE date >= COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
      AND date <= COALESCE($2, CURRENT_DATE)
    GROUP BY date
    ORDER BY date ASC
  `,
    [dto.from ?? null, dto.to ?? null],
  );

  await setToCache(cacheKey, results, 300);
  return results;
}

// ─── User analytics ──────────────────────────────────────────────────────────

export async function getUserAnalytics(dto: AnalyticsQueryDto): Promise<UserDailyMetrics[]> {
  const whereClause = dto.from ? { date: new Date(dto.from) } : {};
  const results = await AppDataSource.getRepository(UserDailyMetrics).find({
    where: whereClause,
    order: { date: 'ASC' },
  });
  return results;
}

// ─── Revenue analytics ───────────────────────────────────────────────────────

export async function getRevenueAnalytics(dto: AnalyticsQueryDto): Promise<RevenueMetricRow[]> {
  const cacheKey = `analytics:revenue:${JSON.stringify(dto)}`;
  const cached = await getFromCache<RevenueMetricRow[]>(cacheKey);
  if (cached) return cached;

  const results: RevenueMetricRow[] = await AppDataSource.query(
    `
    SELECT
      date,
      SUM(revenue_cents)::bigint AS revenue_cents,
      SUM(active_count)::int AS active_subscriptions
    FROM subscription_daily_metrics
    WHERE date >= COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
    GROUP BY date
    ORDER BY date ASC
  `,
    [dto.from ?? null],
  );

  await setToCache(cacheKey, results, 900); // 15 minutes TTL
  return results;
}

// ─── Category distribution ───────────────────────────────────────────────────

export async function getCategoryAnalytics(): Promise<CategoryMetricRow[]> {
  return AppDataSource.query(`
    SELECT
      c.name,
      COUNT(t.id)::int AS tender_count,
      COALESCE(SUM(t.budget), 0)::numeric AS total_budget
    FROM categories c
    LEFT JOIN tenders t ON t.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY tender_count DESC
    LIMIT 10
  `);
}

// ─── Infrastructure Metrics ──────────────────────────────────────────────────

export async function getSystemPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
  const cacheKey = 'analytics:system';
  const cached = await getFromCache<SystemPerformanceMetrics>(cacheKey);
  if (cached) return cached;

  // Read mock indicators (Prometheus/OpenTelemetry simulation)
  const results: SystemPerformanceMetrics = {
    apiResponseTimeMs: 142,
    databaseQueriesPerSecond: 64,
    backgroundJobsQueueLength: 2,
    failedJobsCount: 0,
    cpuUsagePercent: 34.2,
    memoryUsagePercent: 58.1,
    cacheHitRatio: 0.94,
    storageUsedBytes: 42949672960,
  };

  await setToCache(cacheKey, results, 30); // 30 seconds TTL
  return results;
}

// ─── Alerts & Dashboard Personalization ──────────────────────────────────────

export async function getDashboardLayout(userId: string): Promise<UserDashboardLayout> {
  const layoutRepo = AppDataSource.getRepository(UserDashboardLayout);
  let layout = await layoutRepo.findOne({ where: { userId } });
  if (!layout) {
    const initialWidgets: DashboardWidget[] = [
      { id: 'totalTenders', x: 0, y: 0, w: 2, h: 2 },
      { id: 'openTenders', x: 2, y: 0, w: 2, h: 2 },
      { id: 'conversionRate', x: 0, y: 2, w: 2, h: 2 },
      { id: 'bidSuccessRate', x: 2, y: 2, w: 2, h: 2 },
      { id: 'mrr', x: 0, y: 4, w: 2, h: 2 },
    ];
    layout = layoutRepo.create({
      userId,
      widgets: initialWidgets,
      theme: DashboardTheme.DEFAULT,
    });
    await layoutRepo.save(layout);
  }
  return layout;
}

export async function saveDashboardLayout(
  userId: string,
  dto: SaveDashboardLayoutDto,
): Promise<UserDashboardLayout> {
  const layoutRepo = AppDataSource.getRepository(UserDashboardLayout);
  let layout = await layoutRepo.findOne({ where: { userId } });

  const dbWidgets: DashboardWidget[] = dto.widgets.map((wId, index) => ({
    id: wId,
    x: (index % 2) * 2,
    y: Math.floor(index / 2) * 2,
    w: 2,
    h: 2,
  }));

  if (!layout) {
    layout = layoutRepo.create({
      userId,
      widgets: dbWidgets,
      filters: dto.filters,
      theme: DashboardTheme.DEFAULT,
    });
  } else {
    layout.widgets = dbWidgets;
    layout.filters = dto.filters;
    layout.theme = DashboardTheme.DEFAULT;
  }
  return layoutRepo.save(layout);
}

export async function listActiveAlerts(): Promise<AnalyticsAlert[]> {
  return AppDataSource.getRepository(AnalyticsAlert).find({
    where: { resolved: false },
    order: { createdAt: 'DESC' },
  });
}

export async function resolveAlert(alertId: string, resolvedBy: string): Promise<AnalyticsAlert> {
  const alertRepo = AppDataSource.getRepository(AnalyticsAlert);
  const alert = await alertRepo.findOne({ where: { id: alertId } });
  if (!alert)
    throw new AppError(
      AppErrorMessage.ALERT_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  alert.resolved = true;
  alert.resolvedAt = new Date();
  alert.resolvedBy = resolvedBy;
  return alertRepo.save(alert);
}

// ─── Export requests & Scheduled reports ─────────────────────────────────────

export interface ExportJobResponse {
  id: string;
  userId: string;
  status: ExportJobStatus;
  progress: number;
  exportType: ExportJobType;
  fileName: string | null;
  fileUrl: string | null;
  expiresAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapExportJobToResponse(job: ExportJob): ExportJobResponse {
  return {
    id: job.id,
    userId: job.userId,
    status: job.status,
    progress: job.progress,
    exportType: job.exportType,
    fileName: job.fileName,
    fileUrl: job.fileName ? `/api/v1/analytics/exports/download/${job.fileName}` : null,
    expiresAt: job.expiresAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function createExportJob(userId: string, type: string): Promise<ExportJobResponse> {
  const exportRepo = AppDataSource.getRepository(ExportJob);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // link active for 24 hours

  const job = exportRepo.create({
    userId,
    exportType: type as ExportJobType,
    status: ExportJobStatus.PENDING,
    progress: 0,
    expiresAt,
    format: ExportFormat.CSV,
  });

  const savedJob = await exportRepo.save(job);
  return mapExportJobToResponse(savedJob);
}

export async function getExportJobsList(userId: string): Promise<ExportJobResponse[]> {
  const jobs = await AppDataSource.getRepository(ExportJob).find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });
  return jobs.map(mapExportJobToResponse);
}

export async function createScheduledReport(
  userId: string,
  dto: CreateScheduledReportDto,
): Promise<ScheduledReport> {
  const reportRepo = AppDataSource.getRepository(ScheduledReport);
  const recipientRepo = AppDataSource.getRepository(ScheduledReportRecipient);

  const report = reportRepo.create({
    reportName: dto.reportName,
    reportType: ReportType.TENDER,
    frequency: dto.frequency.toLowerCase() as ReportFrequency,
    timezone: dto.timezone,
    filters: dto.filters,
    format: ReportFormat.PDF,
    isActive: true,
    createdByUserId: userId,
  });

  const savedReport = await reportRepo.save(report);

  const recipientsList: ScheduledReportRecipient[] = [];

  if (dto.recipients.users) {
    dto.recipients.users.forEach((userId) => {
      recipientsList.push(
        recipientRepo.create({
          reportId: savedReport.id,
          recipientType: RecipientType.USER,
          recipientId: userId,
        }),
      );
    });
  }
  if (dto.recipients.roles) {
    dto.recipients.roles.forEach((roleId) => {
      recipientsList.push(
        recipientRepo.create({
          reportId: savedReport.id,
          recipientType: RecipientType.ROLE,
          recipientId: roleId,
        }),
      );
    });
  }
  if (dto.recipients.emails) {
    dto.recipients.emails.forEach((email) => {
      recipientsList.push(
        recipientRepo.create({
          reportId: savedReport.id,
          recipientType: RecipientType.EMAIL,
          email,
        }),
      );
    });
  }
  if (dto.recipients.webhooks) {
    dto.recipients.webhooks.forEach((webhook) => {
      recipientsList.push(
        recipientRepo.create({
          reportId: savedReport.id,
          recipientType: RecipientType.WEBHOOK,
          webhook,
        }),
      );
    });
  }

  if (recipientsList.length > 0) {
    savedReport.recipients = await recipientRepo.save(recipientsList);
  } else {
    savedReport.recipients = [];
  }

  return savedReport;
}

export async function listScheduledReports(): Promise<ScheduledReport[]> {
  return AppDataSource.getRepository(ScheduledReport).find({
    order: { createdAt: 'DESC' },
  });
}
