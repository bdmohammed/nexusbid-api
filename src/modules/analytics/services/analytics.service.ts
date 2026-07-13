import { AppDataSource } from "../../../config/database";
import { TenderDailyMetrics } from "../../../database/entities/TenderDailyMetrics";
import { UserDailyMetrics } from "../../../database/entities/UserDailyMetrics";
import { SubscriptionDailyMetrics } from "../../../database/entities/SubscriptionDailyMetrics";
import { TrafficDailyMetrics } from "../../../database/entities/TrafficDailyMetrics";
import { UserDashboardLayout } from "../../../database/entities/UserDashboardLayout";
import { AnalyticsAlert } from "../../../database/entities/AnalyticsAlert";
import { ScheduledReport } from "../../../database/entities/ScheduledReport";
import { ExportJob } from "../../../database/entities/ExportJob";
import { MetricFormulas } from "../metrics/formulas";
import { getFromCache, setToCache } from "../cache/redis";
import { AppError } from "../../../core/AppError";
import type {
  AnalyticsQueryDto,
  SaveDashboardLayoutDto,
  CreateScheduledReportDto,
} from "../dto/analytics.dto";

// ─── Overview metrics ────────────────────────────────────────────────────────

export async function getOverviewStats(dto: AnalyticsQueryDto): Promise<any> {
  const cacheKey = `analytics:overview:${JSON.stringify(dto)}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const tenderMetrics = AppDataSource.getRepository(TenderDailyMetrics);
  const qb = tenderMetrics
    .createQueryBuilder("m")
    .select("SUM(m.created_count)", "created")
    .addSelect("SUM(m.published_count)", "published")
    .addSelect("SUM(m.awarded_count)", "awarded")
    .addSelect("SUM(m.total_budget)", "totalBudget")
    .addSelect("SUM(m.bid_count)", "bids");

  if (dto.from) qb.andWhere("m.date >= :from", { from: dto.from });
  if (dto.to) qb.andWhere("m.date <= :to", { to: dto.to });
  if (dto.country)
    qb.andWhere("m.country = :country", { country: dto.country });

  const raw = await qb.getRawOne();

  // Combine with calculated metrics formulas
  const data = {
    totalRevenue: 245000, // mock revenue sum
    activeMonthlyRevenueCents: 12500000,
    uniqueVisitors: 45000,
    bidsSubmitted: parseInt(raw.bids || "0", 10),
    bidsAwarded: parseInt(raw.awarded || "0", 10),
    activeSubscribers: 420,
    cancelledThisMonth: 12,
    activeUsers: 850,
    revenueCents: 24500000,
    tendersCreated: parseInt(raw.created || "0", 10),
    tendersPublished: parseInt(raw.published || "0", 10),
    totalBudget: parseFloat(raw.totalBudget || "0.00"),
  };

  const results = {
    totalTenders: data.tendersCreated,
    openTenders: data.tendersPublished,
    awardedTenders: data.bidsAwarded,
    totalBudget: data.totalBudget,
    mrr: MetricFormulas["mrr"].calculate(data),
    arr: MetricFormulas["arr"].calculate(data),
    conversionRate: MetricFormulas["conversion_rate"].calculate(data),
    bidSuccessRate: MetricFormulas["bid_success_rate"].calculate(data),
    churnRate: MetricFormulas["churn_rate"].calculate(data),
    arpu: MetricFormulas["arpu"].calculate(data),
    ltv: MetricFormulas["ltv"].calculate(data),
  };

  await setToCache(cacheKey, results, 300); // 5 minutes TTL
  return results;
}

// ─── Tenders analytics ───────────────────────────────────────────────────────

export async function getTenderAnalytics(
  dto: AnalyticsQueryDto,
): Promise<any[]> {
  const cacheKey = `analytics:tenders:${JSON.stringify(dto)}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const results = await AppDataSource.query(
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
    [dto.from || null, dto.to || null],
  );

  await setToCache(cacheKey, results, 300);
  return results;
}

// ─── User analytics ──────────────────────────────────────────────────────────

export async function getUserAnalytics(dto: AnalyticsQueryDto): Promise<any[]> {
  const results = await AppDataSource.getRepository(UserDailyMetrics).find({
    where: {
      date: dto.from, // simple filter wrapper
    },
    order: { date: "ASC" },
  });
  return results;
}

// ─── Revenue analytics ───────────────────────────────────────────────────────

export async function getRevenueAnalytics(
  dto: AnalyticsQueryDto,
): Promise<any> {
  const cacheKey = `analytics:revenue:${JSON.stringify(dto)}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const results = await AppDataSource.query(
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
    [dto.from || null],
  );

  await setToCache(cacheKey, results, 900); // 15 minutes TTL
  return results;
}

// ─── Category distribution ───────────────────────────────────────────────────

export async function getCategoryAnalytics(): Promise<any[]> {
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

export async function getSystemPerformanceMetrics(): Promise<any> {
  const cacheKey = "analytics:system";
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  // Read mock indicators (Prometheus/OpenTelemetry simulation)
  const results = {
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

export async function getDashboardLayout(
  userId: string,
): Promise<UserDashboardLayout> {
  const layoutRepo = AppDataSource.getRepository(UserDashboardLayout);
  let layout = await layoutRepo.findOne({ where: { userId } });
  if (!layout) {
    layout = layoutRepo.create({
      userId,
      widgets: [
        "totalTenders",
        "openTenders",
        "conversionRate",
        "bidSuccessRate",
        "mrr",
      ],
      theme: "default",
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
  if (!layout) {
    layout = layoutRepo.create({ userId, ...dto });
  } else {
    layout.widgets = dto.widgets;
    layout.filters = dto.filters;
    layout.theme = dto.theme;
    layout.favorites = dto.favorites;
  }
  return layoutRepo.save(layout);
}

export async function listActiveAlerts(): Promise<AnalyticsAlert[]> {
  return AppDataSource.getRepository(AnalyticsAlert).find({
    where: { resolved: false },
    order: { createdAt: "DESC" },
  });
}

export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
): Promise<AnalyticsAlert> {
  const alertRepo = AppDataSource.getRepository(AnalyticsAlert);
  const alert = await alertRepo.findOne({ where: { id: alertId } });
  if (!alert) throw new AppError("Alert not found", 404, "NOT_FOUND");

  alert.resolved = true;
  alert.resolvedAt = new Date();
  alert.resolvedBy = resolvedBy;
  return alertRepo.save(alert);
}

// ─── Export requests & Scheduled reports ─────────────────────────────────────

export async function createExportJob(
  userId: string,
  type: string,
): Promise<ExportJob> {
  const exportRepo = AppDataSource.getRepository(ExportJob);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // link active for 24 hours

  const job = exportRepo.create({
    userId,
    exportType: type,
    status: "PENDING",
    progress: 0,
    expiresAt,
  });

  return exportRepo.save(job);
}

export async function getExportJobsList(userId: string): Promise<ExportJob[]> {
  return AppDataSource.getRepository(ExportJob).find({
    where: { userId },
    order: { createdAt: "DESC" },
  });
}

export async function createScheduledReport(
  dto: CreateScheduledReportDto,
): Promise<ScheduledReport> {
  const reportRepo = AppDataSource.getRepository(ScheduledReport);
  const report = reportRepo.create(dto as any) as unknown as ScheduledReport;
  return reportRepo.save(report);
}

export async function listScheduledReports(): Promise<ScheduledReport[]> {
  return AppDataSource.getRepository(ScheduledReport).find({
    order: { createdAt: "DESC" },
  });
}
