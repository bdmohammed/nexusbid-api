import { AppDataSource } from '../../../config/database';
import { logger } from '../../../config/logger';
import { Country } from '../../../database/entities/Country';
import { SubscriptionDailyMetrics } from '../../../database/entities/SubscriptionDailyMetrics';
import { TenderDailyMetrics } from '../../../database/entities/TenderDailyMetrics';
import { TrafficDailyMetrics } from '../../../database/entities/TrafficDailyMetrics';
import { UserDailyMetrics } from '../../../database/entities/UserDailyMetrics';
import { BrowserType, DeviceType } from '../../../types/enums';

export async function runDailyRollups(targetDate: Date = new Date()): Promise<void> {
  const dateStr = targetDate.toISOString().split('T')[0] ?? '';
  logger.info({ date: dateStr }, 'Running daily analytical rollups');

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const countryRepo = AppDataSource.getRepository(Country);
    const countriesDb = await countryRepo.find();
    const countryMap = new Map(countriesDb.map((c) => [c.code.toUpperCase(), c]));

    // 1. Tenders Aggregates
    const tenderMetricsRepo = AppDataSource.getRepository(TenderDailyMetrics);

    // Instead of simple find, let's build standard PostgreSQL queries to get aggregates of yesterday's events:
    const tenderAggs = await AppDataSource.query(
      `
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
    `,
      [startOfDay, endOfDay],
    );

    for await (const agg of tenderAggs) {
      const rawCountryCode = agg.country.trim().toUpperCase();
      const country = countryMap.get(rawCountryCode);

      const metric = tenderMetricsRepo.create({
        date: new Date(dateStr),
        countryId: country ? parseInt(country.id, 10) : null,
        categoryId: agg.category_id,
        procurementType: agg.tender_type,
        createdCount: parseInt(agg.created_count, 10),
        publishedCount: parseInt(agg.published_count, 10),
        awardedCount: parseInt(agg.awarded_count, 10),
        totalBudget: parseFloat(agg.total_budget),
        averageEvaluationTimeSeconds: parseFloat(agg.average_evaluation_time),
        bidCount: parseInt(agg.bid_count, 10),
      });
      await tenderMetricsRepo.save(metric);
    }

    // 2. Users Aggregates
    const userMetricsRepo = AppDataSource.getRepository(UserDailyMetrics);
    const userAggs = await AppDataSource.query(
      `
      SELECT
        COALESCE(properties->>'country', 'US') AS country,
        COUNT(CASE WHEN event_type = 'USER_REGISTERED' THEN 1 END) AS new_users,
        COUNT(CASE WHEN event_type = 'USER_LOGGED_IN' THEN 1 END) AS active_users,
        COUNT(CASE WHEN event_type = 'USER_VERIFIED' THEN 1 END) AS verified_users
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY country
    `,
      [startOfDay, endOfDay],
    );

    for (const agg of userAggs) {
      const rawCountryCode = agg.country.trim().toUpperCase();
      const country = countryMap.get(rawCountryCode);

      const metric = userMetricsRepo.create({
        date: new Date(dateStr),
        countryId: country ? parseInt(country.id, 10) : null,
        newUsers: parseInt(agg.new_users, 10),
        activeUsers: parseInt(agg.active_users, 10),
        verifiedUsers: parseInt(agg.verified_users, 10),
      });
      await userMetricsRepo.save(metric);
    }

    // 3. Subscriptions Aggregates
    const subMetricsRepo = AppDataSource.getRepository(SubscriptionDailyMetrics);
    const subAggs = await AppDataSource.query(
      `
      SELECT
        (properties->>'planId')::uuid AS plan_id,
        COALESCE(properties->>'currency', 'USD') AS currency,
        COUNT(CASE WHEN event_type = 'SUBSCRIPTION_CREATED' THEN 1 END) AS active_count,
        COALESCE(SUM((properties->>'amountCents')::bigint), 0) AS revenue_cents
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY plan_id, currency
    `,
      [startOfDay, endOfDay],
    );

    for (const agg of subAggs) {
      const metric = subMetricsRepo.create({
        date: new Date(dateStr),
        planId: agg.plan_id,
        currency: agg.currency,
        activeCount: parseInt(agg.active_count, 10),
        revenueCents: parseInt(agg.revenue_cents, 10),
      });
      await subMetricsRepo.save(metric);
    }

    // 4. Traffic Aggregates
    const trafficMetricsRepo = AppDataSource.getRepository(TrafficDailyMetrics);

    const trafficAggs = await AppDataSource.query(
      `
      SELECT
        COALESCE(properties->>'country', 'US') AS country_code,
        properties->>'device' AS device,
        properties->>'browser' AS browser,
        COUNT(DISTINCT actor_id) AS unique_visitors,
        COUNT(CASE WHEN event_type = 'PAGE_VIEW' THEN 1 END) AS page_views,
        COUNT(CASE WHEN event_type = 'TENDER_VIEWED' THEN 1 END) AS tender_views,
        COUNT(CASE WHEN event_type = 'TENDER_DOWNLOADED' THEN 1 END) AS tender_downloads,
        COUNT(CASE WHEN event_type = 'SEARCH' THEN 1 END) AS searches_count
      FROM analytics_events
      WHERE occurred_at >= $1 AND occurred_at <= $2
      GROUP BY country_code, device, browser
    `,
      [startOfDay, endOfDay],
    );

    for await (const agg of trafficAggs) {
      const rawCountryCode = (agg.country_code ?? 'US').trim().toUpperCase();
      const country = countryMap.get(rawCountryCode);

      const rawDevice = (agg.device ?? '').trim().toUpperCase();
      const device = Object.values(DeviceType).includes(rawDevice as DeviceType)
        ? (rawDevice as DeviceType)
        : DeviceType.DESKTOP;

      const rawBrowser = (agg.browser ?? '').trim().toUpperCase();
      const browser = Object.values(BrowserType).includes(rawBrowser as BrowserType)
        ? (rawBrowser as BrowserType)
        : BrowserType.OTHER;

      const metric = trafficMetricsRepo.create({
        date: dateStr,
        countryId: country ? parseInt(country.id, 10) : null,
        device,
        browser,
        uniqueVisitors: parseInt(agg.unique_visitors, 10) || 0,
        newVisitors: 0,
        returningVisitors: 0,
        pageViews: parseInt(agg.page_views, 10) || 0,
        tenderViews: parseInt(agg.tender_views, 10) || 0,
        searchCount: parseInt(agg.searches_count, 10) || 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        signupCount: 0,
        subscriptionCount: 0,
        revenue: 0,
        tenderDownloads: parseInt(agg.tender_downloads, 10) || 0,
        apiRequests: 0,
        errorCount: 0,
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

  logger.info(
    { thresholdDate: twoYearsAgo.toISOString() },
    'Cleaning up raw analytics events older than 2 years',
  );
  try {
    await AppDataSource.query(
      `
      DELETE FROM analytics_events
      WHERE occurred_at < $1
    `,
      [twoYearsAgo],
    );
    logger.info('Analytics events cleanup complete');
  } catch (err) {
    logger.error({ err }, 'Failed to run analytics data retention cleanup');
  }
}

// ─── Development Seeding Helper (Only called in dev/seed) ────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
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
  const countryRepo = AppDataSource.getRepository(Country);

  const countryCodes = ['US', 'CA', 'IN'];
  const countryMap: Record<string, Country> = {};
  for (const code of countryCodes) {
    let country = await countryRepo.findOne({ where: { code } });
    if (!country) {
      country = countryRepo.create({
        code,
        name: code === 'US' ? 'United States' : code === 'CA' ? 'Canada' : 'India',
        slug: code === 'US' ? 'united-states' : code === 'CA' ? 'canada' : 'india',
        isActive: true,
      });
      country = await countryRepo.save(country);
    }
    countryMap[code] = country;
  }

  const countries = ['USA', 'Canada', 'India'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const tenderTypes = ['Government RFP', 'Commercial Bid', 'Public Tender'];

  const countryNameToCode: Record<string, string> = {
    USA: 'US',
    Canada: 'CA',
    India: 'IN',
  };

  for (let i = 90; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0] ?? '';

    // Seed Tenders
    // eslint-disable-next-line no-await-in-loop
    for await (const c of countries) {
      for await (const t of tenderTypes) {
        const code = countryNameToCode[c] as string;
        const countryEntity = countryMap[code];
        const metric = tenderMetricsRepo.create({
          date: new Date(dateStr),
          countryId: countryEntity ? parseInt(countryEntity.id, 10) : null,
          procurementType: t,
          createdCount: Math.floor(Math.random() * 8) + 2,
          publishedCount: Math.floor(Math.random() * 7) + 2,
          awardedCount: Math.floor(Math.random() * 5) + 1,
          cancelledCount: Math.floor(Math.random() * 2),
          totalBudget: Math.floor(Math.random() * 500000) + 100000,
          averageEvaluationTimeSeconds: Math.floor(Math.random() * 10000) + 5000,
          averageAwardTimeSeconds: Math.floor(Math.random() * 20000) + 10000,
          bidCount: Math.floor(Math.random() * 30) + 5,
        });
        await tenderMetricsRepo.save(metric);
      }
    }

    // Seed Users
    // eslint-disable-next-line no-await-in-loop
    for await (const c of countries) {
      const code = countryNameToCode[c] as string;
      const countryEntity = countryMap[code];
      const metric = userMetricsRepo.create({
        date: new Date(dateStr),
        countryId: countryEntity ? parseInt(countryEntity.id, 10) : null,
        newUsers: Math.floor(Math.random() * 15) + 5,
        activeUsers: Math.floor(Math.random() * 200) + 50,
        verifiedUsers: Math.floor(Math.random() * 10) + 3,
      });
      await userMetricsRepo.save(metric);
    }

    // Seed Subscriptions

    const subMetric = subMetricsRepo.create({
      date: new Date(dateStr),
      activeCount: Math.floor(Math.random() * 100) + 400,
      revenueCents: Math.floor(Math.random() * 200000) + 1500000,
    });
    await subMetricsRepo.save(subMetric);

    // Seed Traffic
    const mappedCountryCodes = ['US', 'CA', 'IN'];
    for (const code of mappedCountryCodes) {
      const countryEntity = countryMap[code];
      for (const dev of devices) {
        const rawDevice = dev.toUpperCase();
        const deviceEnum = Object.values(DeviceType).includes(rawDevice as DeviceType)
          ? (rawDevice as DeviceType)
          : DeviceType.DESKTOP;

        const randomBrowser = browsers[
          Math.floor(Math.random() * browsers.length)
        ]?.toUpperCase() as BrowserType;
        const browserEnum = Object.values(BrowserType).includes(randomBrowser)
          ? randomBrowser
          : BrowserType.OTHER;

        const unique = Math.floor(Math.random() * 1000) + 200;
        const pageViewsVal = Math.floor(Math.random() * 5000) + 1000;
        const tenderViewsVal = Math.floor(Math.random() * 1200) + 300;
        const tenderDownloadsVal = Math.floor(Math.random() * 200) + 50;
        const searchCountVal = Math.floor(Math.random() * 800) + 100;

        const metric = trafficMetricsRepo.create({
          date: dateStr,
          countryId: countryEntity ? parseInt(countryEntity.id, 10) : null,
          device: deviceEnum,
          browser: browserEnum,
          uniqueVisitors: unique,
          newVisitors: Math.floor(unique * 0.4),
          returningVisitors: Math.floor(unique * 0.6),
          pageViews: pageViewsVal,
          tenderViews: tenderViewsVal,
          searchCount: searchCountVal,
          avgSessionDuration: Math.floor(Math.random() * 300) + 60,
          bounceRate: parseFloat((Math.random() * 40 + 20).toFixed(2)),
          signupCount: Math.floor(Math.random() * 10),
          subscriptionCount: Math.floor(Math.random() * 5),
          revenue: Math.floor(Math.random() * 100000),
          tenderDownloads: tenderDownloadsVal,
          apiRequests: pageViewsVal * 5,
          errorCount: Math.floor(Math.random() * 5),
        });
        await trafficMetricsRepo.save(metric);
      }
    }
  }

  logger.info('✓ Seeding dev historical metrics complete');
}
