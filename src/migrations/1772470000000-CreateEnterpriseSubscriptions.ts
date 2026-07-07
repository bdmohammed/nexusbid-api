import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnterpriseSubscriptions1772470000000 implements MigrationInterface {
  name = 'CreateEnterpriseSubscriptions1772470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── TENDER GOVERNANCE UPGRADES ──────────────────────────────────────────

    // 1. Modify tender_amendments
    await queryRunner.query(`
      ALTER TABLE "tender_amendments" ADD COLUMN "tender_version_id" UUID NULL;
      ALTER TABLE "tender_amendments" ADD COLUMN "title" VARCHAR(255) NULL;
      ALTER TABLE "tender_amendments" ADD COLUMN "description" TEXT NULL;
      ALTER TABLE "tender_amendments" ADD COLUMN "effective_at" TIMESTAMPTZ NULL;
      ALTER TABLE "tender_amendments" ADD COLUMN "published_by_id" UUID NULL;

      ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_tender_amendments_version" FOREIGN KEY ("tender_version_id") REFERENCES "tender_versions"("id") ON DELETE SET NULL;
      ALTER TABLE "tender_amendments" ADD CONSTRAINT "FK_tender_amendments_publisher" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    // 2. Create evaluation_templates
    await queryRunner.query(`
      CREATE TABLE "evaluation_templates" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"           VARCHAR(100) NOT NULL UNIQUE,
        "description"    TEXT NULL,
        "default_weight" NUMERIC(5, 2) DEFAULT 0.00,
        "max_score"      INTEGER DEFAULT 100,
        "created_at"     TIMESTAMPTZ DEFAULT now(),
        "updated_at"     TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 3. Create tender_submissions
    await queryRunner.query(`
      CREATE TABLE "tender_submissions" (
        "id"                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_participant_id"  UUID NOT NULL REFERENCES "tender_participants"("id") ON DELETE CASCADE,
        "document_version"       INTEGER DEFAULT 1,
        "bid_amount_cents"       BIGINT NOT NULL,
        "technical_proposal_url" TEXT NULL,
        "financial_proposal_url" TEXT NULL,
        "status"                 VARCHAR(50) DEFAULT 'SUBMITTED',
        "submitted_at"           TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 4. Modify tender_evaluations
    await queryRunner.query(`
      ALTER TABLE "tender_evaluations" ADD COLUMN "submission_id" UUID NULL REFERENCES "tender_submissions"("id") ON DELETE CASCADE;
      ALTER TABLE "tender_evaluations" ADD COLUMN "evaluation_template_id" UUID NULL REFERENCES "evaluation_templates"("id") ON DELETE SET NULL;
      ALTER TABLE "tender_evaluations" ALTER COLUMN "criteria_name" DROP NOT NULL;
    `);

    // 5. Modify tender_watchers
    await queryRunner.query(`
      ALTER TABLE "tender_watchers" ADD COLUMN "channels" JSONB DEFAULT '["EMAIL", "IN_APP"]';
      ALTER TABLE "tender_watchers" DROP COLUMN IF EXISTS "notify_email";
      ALTER TABLE "tender_watchers" DROP COLUMN IF EXISTS "notify_in_app";
      ALTER TABLE "tender_watchers" DROP COLUMN IF EXISTS "notify_sms";
    `);

    // ─── SUBSCRIPTION & BILLING UPGRADES ─────────────────────────────────────

    // 6. Create feature_catalog
    await queryRunner.query(`
      CREATE TABLE "feature_catalog" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "feature_key" VARCHAR(100) NOT NULL UNIQUE,
        "name"        VARCHAR(150) NOT NULL,
        "description" TEXT NULL,
        "created_at"  TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 7. Create plan_versions
    await queryRunner.query(`
      CREATE TABLE "plan_versions" (
        "id"                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_id"            UUID NOT NULL REFERENCES "plans"("id") ON DELETE CASCADE,
        "version"            INTEGER NOT NULL,
        "status"             VARCHAR(50) DEFAULT 'DRAFT',
        "name"               VARCHAR(80) NOT NULL,
        "subtitle"           VARCHAR(255) NULL,
        "description"        TEXT NULL,
        "price_cents"        INTEGER NOT NULL,
        "currency"           VARCHAR(10) DEFAULT 'USD',
        "duration_days"      INTEGER NOT NULL,
        "trial_days"         INTEGER DEFAULT 0,
        "setup_fee_cents"    INTEGER DEFAULT 0,
        "is_recurring"       BOOLEAN DEFAULT true,
        "is_featured"        BOOLEAN DEFAULT false,
        "badge"              VARCHAR(50) NULL,
        "plan_type"          VARCHAR(50) DEFAULT 'all-access',
        "target_state_id"    UUID NULL REFERENCES "states"("id") ON DELETE SET NULL,
        "target_country"     VARCHAR(100) NULL,
        "target_category_id" UUID NULL REFERENCES "categories"("id") ON DELETE SET NULL,
        "bundle_size"        INTEGER NULL,
        "created_by_id"      UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_by_id"      UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"         TIMESTAMPTZ DEFAULT now(),
        "updated_at"         TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 8. Create plan_features
    await queryRunner.query(`
      CREATE TABLE "plan_features" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_version_id" UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "feature_key"     VARCHAR(100) NOT NULL,
        "limit_value"     VARCHAR(100) NOT NULL,
        "created_at"      TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 9. Create plan_country_pricing
    await queryRunner.query(`
      CREATE TABLE "plan_country_pricing" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_version_id" UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "country"         VARCHAR(100) NOT NULL,
        "currency"        VARCHAR(10) NOT NULL,
        "price_cents"     INTEGER NOT NULL,
        "created_at"      TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 10. Create plan_category_pricing
    await queryRunner.query(`
      CREATE TABLE "plan_category_pricing" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_version_id" UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "category_id"     UUID NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "price_cents"     INTEGER NOT NULL,
        "created_at"      TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 11. Create coupons
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id"               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "code"             VARCHAR(50) NOT NULL UNIQUE,
        "discount_type"    VARCHAR(50) NOT NULL,
        "discount_value"   INTEGER NOT NULL,
        "is_active"        BOOLEAN DEFAULT true,
        "max_redemptions"  INTEGER NULL,
        "redemption_count" INTEGER DEFAULT 0,
        "expires_at"       TIMESTAMPTZ NULL,
        "created_at"       TIMESTAMPTZ DEFAULT now(),
        "updated_at"       TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 12. Create plan_reviews
    await queryRunner.query(`
      CREATE TABLE "plan_reviews" (
        "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_version_id"      UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "status"               VARCHAR(50) DEFAULT 'SUBMITTED',
        "assigned_reviewer_id" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"           TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 13. Create plan_review_comments
    await queryRunner.query(`
      CREATE TABLE "plan_review_comments" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "plan_review_id" UUID NOT NULL REFERENCES "plan_reviews"("id") ON DELETE CASCADE,
        "author_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "comment_text"   TEXT NOT NULL,
        "created_at"     TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 14. Create subscription_migrations
    await queryRunner.query(`
      CREATE TABLE "subscription_migrations" (
        "id"                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "source_plan_version_id" UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "target_plan_version_id" UUID NOT NULL REFERENCES "plan_versions"("id") ON DELETE CASCADE,
        "status"                 VARCHAR(50) DEFAULT 'PENDING',
        "started_at"             TIMESTAMPTZ NULL,
        "completed_at"           TIMESTAMPTZ NULL,
        "created_by_id"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at"             TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 15. Modify existing plans table
    await queryRunner.query(`
      ALTER TABLE "plans" DROP CONSTRAINT IF EXISTS "chk_plans_price";
      ALTER TABLE "plans" DROP CONSTRAINT IF EXISTS "chk_plans_duration";
      ALTER TABLE "plans" ALTER COLUMN "price_cents" DROP NOT NULL;
      ALTER TABLE "plans" ALTER COLUMN "duration_days" DROP NOT NULL;
      ALTER TABLE "plans" ALTER COLUMN "features" DROP NOT NULL;
      ALTER TABLE "plans" ALTER COLUMN "is_active" DROP NOT NULL;
      ALTER TABLE "plans" ALTER COLUMN "is_recurring" DROP NOT NULL;

      ALTER TABLE "plans" ADD COLUMN "reference_no" VARCHAR(100) UNIQUE NULL;
      ALTER TABLE "plans" ADD COLUMN "active_version_id" UUID NULL;
      ALTER TABLE "plans" ADD COLUMN "status" VARCHAR(50) DEFAULT 'ACTIVE';
    `);

    // Generate reference numbers for existing plans
    await queryRunner.query(`
      UPDATE "plans" SET "reference_no" = 'PLN-' || UPPER(SUBSTRING(id::text, 1, 8)) WHERE "reference_no" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "plans" ALTER COLUMN "reference_no" SET NOT NULL;
      ALTER TABLE "plans" ADD CONSTRAINT "FK_plans_active_version" FOREIGN KEY ("active_version_id") REFERENCES "plan_versions"("id") ON DELETE SET NULL;
    `);

    // 16. Modify existing subscriptions table
    await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD COLUMN "plan_version_id" UUID NULL;
      ALTER TABLE "subscriptions" ADD COLUMN "coupon_id" UUID NULL REFERENCES "coupons"("id") ON DELETE SET NULL;
      ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_plan_version" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all subscription tables
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_migrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_review_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_category_pricing"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_country_pricing"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_catalog"`);

    // Revert plans modifications
    await queryRunner.query(`
      ALTER TABLE "plans" DROP CONSTRAINT IF EXISTS "FK_plans_active_version";
      ALTER TABLE "plans" DROP COLUMN IF EXISTS "status";
      ALTER TABLE "plans" DROP COLUMN IF EXISTS "active_version_id";
      ALTER TABLE "plans" DROP COLUMN IF EXISTS "reference_no";
    `);

    // Revert subscriptions modifications
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_plan_version";
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "coupon_id";
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "plan_version_id";
    `);

    // Revert watcher preferences modifications
    await queryRunner.query(`
      ALTER TABLE "tender_watchers" DROP COLUMN IF EXISTS "channels";
      ALTER TABLE "tender_watchers" ADD COLUMN "notify_email" BOOLEAN DEFAULT true;
      ALTER TABLE "tender_watchers" ADD COLUMN "notify_in_app" BOOLEAN DEFAULT true;
      ALTER TABLE "tender_watchers" ADD COLUMN "notify_sms" BOOLEAN DEFAULT false;
    `);

    // Revert tender evaluations modifications
    await queryRunner.query(`
      ALTER TABLE "tender_evaluations" DROP COLUMN IF EXISTS "evaluation_template_id";
      ALTER TABLE "tender_evaluations" DROP COLUMN IF EXISTS "submission_id";
      ALTER TABLE "tender_evaluations" ALTER COLUMN "criteria_name" SET NOT NULL;
    `);

    // Drop tender submissions, evaluation templates, modify amendments
    await queryRunner.query(`DROP TABLE IF EXISTS "tender_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evaluation_templates"`);

    await queryRunner.query(`
      ALTER TABLE "tender_amendments" DROP CONSTRAINT IF EXISTS "FK_tender_amendments_publisher";
      ALTER TABLE "tender_amendments" DROP CONSTRAINT IF EXISTS "FK_tender_amendments_version";
      ALTER TABLE "tender_amendments" DROP COLUMN IF EXISTS "published_by_id";
      ALTER TABLE "tender_amendments" DROP COLUMN IF EXISTS "effective_at";
      ALTER TABLE "tender_amendments" DROP COLUMN IF EXISTS "description";
      ALTER TABLE "tender_amendments" DROP COLUMN IF EXISTS "title";
      ALTER TABLE "tender_amendments" DROP COLUMN IF EXISTS "tender_version_id";
    `);
  }
}
