import { AppDataSource } from '../../../config/database';
import { AnalyticsEvent } from '../../../entities/AnalyticsEvent';
import { TenderDailyMetrics } from '../../../entities/TenderDailyMetrics';
import { UserDailyMetrics } from '../../../entities/UserDailyMetrics';
import { SubscriptionDailyMetrics } from '../../../entities/SubscriptionDailyMetrics';
import { TrafficDailyMetrics } from '../../../entities/TrafficDailyMetrics';
import { logger } from '../../../config/logger';

export async function runDailyRollups(targetDate: Date = new Date()): Promise<void> {
  const dateStr = targetDate.toISOString().split('T')[0];
  logger.info({ date: dateStr }, 'Running daily analytical rollups');

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const eventRepo = AppDataSource.getRepository(AnalyticsEvent);

    // 1. Tenders Aggregates
    const tenderMetricsRepo = AppDataSource.getRepository(TenderDailyMetrics);
    const tenderEvents = await eventRepo.find({
      where: {
        occurredAt: startOfDay, // Note: standard between dates is cleaner:
      }
    });

    // Instead of simple find, let's build standard PostgreSQL queries to get aggregates of yesterday's events:
    const tenderAggs = await AppDataSource.query(`
      SELECT
        COALESCE(properties->>'country', 'US') AS country,
        (properties->>'categoryId')::uuid AS category_id,
        properties->>'tenderType' AS tender_type,
        COUNT(CASE WHEN event_type = 'TENDER_CREATED' THEN 1 END) AS created_count,
        COUNT(CASE WHEN event_type = 'TENDER_PUBLISHED' THEN 1 END) AS published_count,
        COUNT(CASE WHEN event_type = 'TENDER_AWARDED' THEN 1 END) AS awarded_count,
        COALESCE(SUM(CASE WHEN event_type = 'TENDER_CREATED' OR event_type = 'TENDER_PUBLISHED' THEN (properties->>'budget')::numeric ELSE 0 END), 0) AS total_budget,
        COALESCE(AVG(CASE WHEN event_type = 'TENDER_AWARDED' THEN (properties->>'evaluationTimeSeconds')::numeric END), 0) AS average_evaluation_time,
        COUNT(CASE WHEN event_type = 'TENDER_BID' THEN 1 END) AS bid_count
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY country, category_id, tender_type
    `, [startOfDay, endOfDay]);

    for (const agg of tenderAggs) {
      const metric = tenderMetricsRepo.create({
        date: dateStr,
        country: agg.country,
        categoryId: agg.category_id,
        tenderType: agg.tender_type,
        createdCount: parseInt(agg.created_count, 10),
        publishedCount: parseInt(agg.published_count, 10),
        awardedCount: parseInt(agg.awarded_count, 10),
        totalBudget: parseFloat(agg.total_budget),
        averageEvaluationTimeSeconds: parseFloat(agg.average_evaluation_time),
        bidCount: parseInt(agg.bid_count, 10)
      });
      await tenderMetricsRepo.save(metric);
    }

    // 2. Users Aggregates
    const userMetricsRepo = AppDataSource.getRepository(UserDailyMetrics);
    const userAggs = await AppDataSource.query(`
      SELECT
        COALESCE(properties->>'country', 'US') AS country,
        COUNT(CASE WHEN event_type = 'USER_REGISTERED' THEN 1 END) AS new_users,
        COUNT(CASE WHEN event_type = 'USER_LOGGED_IN' THEN 1 END) AS active_users,
        COUNT(CASE WHEN event_type = 'USER_VERIFIED' THEN 1 END) AS verified_users
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY country
    `, [startOfDay, endOfDay]);

    for (const agg of userAggs) {
      const metric = userMetricsRepo.create({
        date: dateStr,
        country: agg.country,
        newUsers: parseInt(agg.new_users, 10),
        activeUsers: parseInt(agg.active_users, 10),
        verifiedUsers: parseInt(agg.verified_users, 10)
      });
      await userMetricsRepo.save(metric);
    }

    // 3. Subscriptions Aggregates
    const subMetricsRepo = AppDataSource.getRepository(SubscriptionDailyMetrics);
    const subAggs = await AppDataSource.query(`
      SELECT
        (properties->>'planId')::uuid AS plan_id,
        COALESCE(properties->>'currency', 'USD') AS currency,
        COUNT(CASE WHEN event_type = 'SUBSCRIPTION_CREATED' THEN 1 END) AS active_count,
        COALESCE(SUM((properties->>'amountCents')::bigint), 0) AS revenue_cents
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY plan_id, currency
    `, [startOfDay, endOfDay]);

    for (const agg of subAggs) {
      const metric = subMetricsRepo.create({
        date: dateStr,
        planId: agg.plan_id,
        currency: agg.currency,
        activeCount: parseInt(agg.active_count, 10),
        revenueCents: parseInt(agg.revenue_cents, 10)
      });
      await subMetricsRepo.save(metric);
    }

    // 4. Traffic Aggregates
    const trafficMetricsRepo = AppDataSource.getRepository(TrafficDailyMetrics);
    const trafficAggs = await AppDataSource.query(`
      SELECT
        COALESCE(properties->>'country', 'US') AS country,
        properties->>'device' AS device,
        properties->>'browser' AS browser,
        COUNT(DISTINCT actor_id) AS unique_visitors,
        COUNT(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 END) AS page_views,
        COUNT(CASE WHEN event_type = 'TENDER_VIEWED' THEN 1 END) AS tender_views,
        COUNT(CASE WHEN event_type = 'TENDER_DOWNLOADED' THEN 1 END) AS tender_downloads,
        COUNT(CASE WHEN event_type = 'SEARCH' THEN 1 END) AS searches_count
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY country, device, browser
    `, [startOfDay, endOfDay]);

    for (const agg of trafficAggs) {
      const metric = trafficMetricsRepo.create({
        date: dateStr,
        country: agg.country,
        device: agg.device,
        browser: agg.browser,
        uniqueVisitors: parseInt(agg.unique_visitors, 10),
        pageViews: parseInt(agg.page_views, 10),
        tenderViews: parseInt(agg.tender_views, 10),
        tenderDownloads: parseInt(agg.tender_downloads, 10),
        searchesCount: parseInt(agg.searches_count, 10)
      });
      await trafficMetricsRepo.save(metric);
    }

    logger.info({ date: dateStr }, 'Daily analytical rollups complete');
  } catch (err) {
    logger.error({ err, date: dateStr }, 'Daily rollups aggregation failed');
  }
}

export async function cleanupAnalyticsData(): Promise<void> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  logger.info({ thresholdDate: twoYearsAgo.toISOString() }, 'Cleaning up raw analytics events older than 2 years');
  try {
    await AppDataSource.query(`
      DELETE FROM analytics_events
      WHERE occurred_at < $1
    `, [twoYearsAgo]);
    logger.info('Analytics events cleanup complete');
  } catch (err) {
    logger.error({ err }, 'Failed to run analytics data retention cleanup');
  }
}

// ─── Development Seeding Helper (Only called in dev/seed) ────────────────────

export async function backfillHistoricalDevMetrics(): Promise<void> {
  logger.info('Checking if daily aggregates need historical backfill...');

  const tenderMetricsRepo = AppDataSource.getRepository(TenderDailyMetrics);
  const count = await tenderMetricsRepo.count();
  if (count > 0) {
    logger.info('Daily metrics table already populated — skipping backfill');
    return;
  }

  logger.info('Daily metrics are empty. Seeding 90 days of dev metrics...');
  const userMetricsRepo = AppDataSource.getRepository(UserDailyMetrics);
  const subMetricsRepo = AppDataSource.getRepository(SubscriptionDailyMetrics);
  const trafficMetricsRepo = AppDataSource.getRepository(TrafficDailyMetrics);

  const countries = ['USA', 'Canada', 'India'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const tenderTypes = ['Government RFP', 'Commercial Bid', 'Public Tender'];

  for (let i = 90; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Seed Tenders
    for (const c of countries) {
      for (const t of tenderTypes) {
        const metric = tenderMetricsRepo.create({
          date: dateStr,
          country: c,
          tenderType: t,
          createdCount: Math.floor(Math.random() * 8) + 2,
          publishedCount: Math.floor(Math.random() * 7) + 2,
          awardedCount: Math.floor(Math.random() * 5) + 1,
          cancelledCount: Math.floor(Math.random() * 2),
          totalBudget: Math.floor(Math.random() * 500000) + 100000,
          averageEvaluationTimeSeconds: Math.floor(Math.random() * 10000) + 5000,
          averageAwardTimeSeconds: Math.floor(Math.random() * 20000) + 10000,
          bidCount: Math.floor(Math.random() * 30) + 5
        });
        await tenderMetricsRepo.save(metric);
      }
    }

    // Seed Users
    for (const c of countries) {
      const metric = userMetricsRepo.create({
        date: dateStr,
        country: c,
        newUsers: Math.floor(Math.random() * 15) + 5,
        activeUsers: Math.floor(Math.random() * 200) + 50,
        verifiedUsers: Math.floor(Math.random() * 10) + 3
      });
      await userMetricsRepo.save(metric);
    }

    // Seed Subscriptions
    const subMetric = subMetricsRepo.create({
      date: dateStr,
      activeCount: Math.floor(Math.random() * 100) + 400,
      revenueCents: Math.floor(Math.random() * 200000) + 1500000
    });
    await subMetricsRepo.save(subMetric);

    // Seed Traffic
    for (const c of countries) {
      for (const dev of devices) {
        const metric = trafficMetricsRepo.create({
          date: dateStr,
          country: c,
          device: dev,
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          uniqueVisitors: Math.floor(Math.random() * 1000) + 200,
          pageViews: Math.floor(Math.random() * 5000) + 1000,
          tenderViews: Math.floor(Math.random() * 1200) + 300,
          tenderDownloads: Math.floor(Math.random() * 200) + 50,
          searchesCount: Math.floor(Math.random() * 800) + 100
        });
        await trafficMetricsRepo.save(metric);
      }
    }
  }

  logger.info('✓ Seeding dev historical metrics complete');
}
