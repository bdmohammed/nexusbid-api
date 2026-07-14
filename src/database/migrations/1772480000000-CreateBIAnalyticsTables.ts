import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBIAnalyticsTables1772480000000 implements MigrationInterface {
  name = "CreateBIAnalyticsTables1772480000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Generic Fact Table
    await queryRunner.query(`
      CREATE TABLE "analytics_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_type" VARCHAR(100) NOT NULL,
        "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "actor_id" UUID,
        "entity_type" VARCHAR(100),
        "entity_id" UUID,
        "properties" JSONB NOT NULL DEFAULT '{}'
      );
      CREATE INDEX "idx_analytics_events_type" ON "analytics_events" ("event_type");
      CREATE INDEX "idx_analytics_events_occurred" ON "analytics_events" ("occurred_at");
    `);

    // 2. Metrics Registry
    await queryRunner.query(`
      CREATE TABLE "analytics_metrics" (
        "key" VARCHAR(100) PRIMARY KEY,
        "display_name" VARCHAR(150) NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "permission_required" VARCHAR(100) NOT NULL DEFAULT 'analytics.view'
      );
    `);

    // 3. User Dashboard Layouts
    await queryRunner.query(`
      CREATE TABLE "user_dashboard_layouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID UNIQUE NOT NULL,
        "widgets" JSONB NOT NULL DEFAULT '[]',
        "filters" JSONB NOT NULL DEFAULT '{}',
        "theme" VARCHAR(50) NOT NULL DEFAULT 'default',
        "favorites" JSONB NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_dashboard_layouts_user" ON "user_dashboard_layouts" ("user_id");
    `);

    // 4. Export Jobs
    await queryRunner.query(`
      CREATE TABLE "export_jobs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "progress" INTEGER NOT NULL DEFAULT 0,
        "export_type" VARCHAR(100) NOT NULL,
        "file_url" VARCHAR(255),
        "expires_at" TIMESTAMPTZ NOT NULL,
        "started_at" TIMESTAMPTZ,
        "finished_at" TIMESTAMPTZ,
        "download_count" INTEGER NOT NULL DEFAULT 0,
        "downloaded_at" TIMESTAMPTZ,
        "error_message" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 5. Analytics Alerts
    await queryRunner.query(`
      CREATE TABLE "analytics_alerts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "metric_key" VARCHAR(100) NOT NULL,
        "trigger_condition" VARCHAR(150) NOT NULL,
        "actual_value" VARCHAR(100) NOT NULL,
        "threshold_value" VARCHAR(100) NOT NULL,
        "severity" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        "resolved" BOOLEAN NOT NULL DEFAULT false,
        "resolved_at" TIMESTAMPTZ,
        "resolved_by" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 6. Scheduled Reports
    await queryRunner.query(`
      CREATE TABLE "scheduled_reports" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "report_name" VARCHAR(150) NOT NULL,
        "frequency" VARCHAR(50) NOT NULL,
        "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
        "filters" JSONB NOT NULL DEFAULT '{}',
        "recipients" JSONB NOT NULL DEFAULT '{}',
        "last_run_at" TIMESTAMPTZ,
        "next_run_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 7. Tender Daily Metrics
    await queryRunner.query(`
      CREATE TABLE "tender_daily_metrics" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" DATE NOT NULL,
        "country" VARCHAR(100),
        "category_id" UUID,
        "tender_type" VARCHAR(100),
        "tender_status" VARCHAR(100),
        "procurement_type" VARCHAR(100),
        "created_count" INTEGER NOT NULL DEFAULT 0,
        "published_count" INTEGER NOT NULL DEFAULT 0,
        "awarded_count" INTEGER NOT NULL DEFAULT 0,
        "cancelled_count" INTEGER NOT NULL DEFAULT 0,
        "total_budget" NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        "average_evaluation_time_seconds" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        "average_award_time_seconds" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        "bid_count" INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX "idx_tender_daily_metrics_date" ON "tender_daily_metrics" ("date");
      CREATE INDEX "idx_tender_daily_metrics_dimensions" ON "tender_daily_metrics" ("date", "country", "category_id");
    `);

    // 8. User Daily Metrics
    await queryRunner.query(`
      CREATE TABLE "user_daily_metrics" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" DATE NOT NULL,
        "country" VARCHAR(100),
        "new_users" INTEGER NOT NULL DEFAULT 0,
        "active_users" INTEGER NOT NULL DEFAULT 0,
        "verified_users" INTEGER NOT NULL DEFAULT 0,
        "blocked_users" INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX "idx_user_daily_metrics_date" ON "user_daily_metrics" ("date");
    `);

    // 9. Subscription Daily Metrics
    await queryRunner.query(`
      CREATE TABLE "subscription_daily_metrics" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" DATE NOT NULL,
        "plan_id" UUID,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
        "active_count" INTEGER NOT NULL DEFAULT 0,
        "expired_count" INTEGER NOT NULL DEFAULT 0,
        "cancelled_count" INTEGER NOT NULL DEFAULT 0,
        "revenue_cents" BIGINT NOT NULL DEFAULT 0
      );
      CREATE INDEX "idx_sub_daily_metrics_date" ON "subscription_daily_metrics" ("date");
    `);

    // 10. Traffic Daily Metrics
    await queryRunner.query(`
      CREATE TABLE "traffic_daily_metrics" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" DATE NOT NULL,
        "country" VARCHAR(100),
        "device" VARCHAR(50),
        "browser" VARCHAR(50),
        "unique_visitors" INTEGER NOT NULL DEFAULT 0,
        "page_views" INTEGER NOT NULL DEFAULT 0,
        "tender_views" INTEGER NOT NULL DEFAULT 0,
        "tender_downloads" INTEGER NOT NULL DEFAULT 0,
        "searches_count" INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX "idx_traffic_daily_metrics_date" ON "traffic_daily_metrics" ("date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "traffic_daily_metrics"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "subscription_daily_metrics"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_daily_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tender_daily_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "export_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_dashboard_layouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events"`);
  }
}
