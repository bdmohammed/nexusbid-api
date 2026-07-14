import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingTables1700000000004 implements MigrationInterface {
  name = "CreateBillingTables1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Plans
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"            VARCHAR(80) NOT NULL,
        "price_cents"     INTEGER     NOT NULL,
        "duration_days"   INTEGER     NOT NULL,
        "paypal_plan_id"  TEXT,
        "features"        JSONB       NOT NULL DEFAULT '{}',
        "is_active"       BOOLEAN     NOT NULL DEFAULT true,
        "is_recurring"    BOOLEAN     NOT NULL DEFAULT false,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_plans_price"    CHECK ("price_cents" >= 0),
        CONSTRAINT "chk_plans_duration" CHECK ("duration_days" > 0)
      )
    `);

    // Subscriptions
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'expired', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id"                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"                  UUID        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "plan_id"                  UUID        NOT NULL REFERENCES "plans"("id") ON DELETE RESTRICT,
        "start_date"               TIMESTAMPTZ NOT NULL,
        "end_date"                 TIMESTAMPTZ NOT NULL,
        "status"                   "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "paypal_subscription_id"   TEXT,
        "paypal_order_id"          TEXT,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_subs_user_status" ON "subscriptions" ("user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_subs_end_status"  ON "subscriptions" ("end_date", "status")`,
    );

    // Transactions
    await queryRunner.query(`
      CREATE TYPE "public"."transactions_type_enum" AS ENUM('subscription', 'per_tender')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."transactions_status_enum" AS ENUM('created', 'success', 'failed', 'refunded')
    `);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"           UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "amount_cents"      INTEGER NOT NULL,
        "currency"          VARCHAR(10) NOT NULL DEFAULT 'usd',
        "type"              "public"."transactions_type_enum" NOT NULL,
        "reference_id"      TEXT,
        "paypal_order_id"   TEXT NOT NULL UNIQUE,
        "paypal_capture_id" TEXT,
        "status"            "public"."transactions_status_enum" NOT NULL DEFAULT 'created',
        "invoice_url"       TEXT,
        "paypal_response"   JSONB,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_txn_user_created" ON "transactions" ("user_id", "created_at")`,
    );

    // Purchased tenders
    await queryRunner.query(`
      CREATE TABLE "purchased_tenders" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"        UUID NOT NULL REFERENCES "users"("id")        ON DELETE CASCADE,
        "tender_id"      UUID NOT NULL REFERENCES "tenders"("id")      ON DELETE CASCADE,
        "transaction_id" UUID NOT NULL REFERENCES "transactions"("id"),
        "purchased_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_purchased_tenders_user_tender" UNIQUE ("user_id", "tender_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "purchased_tenders"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "plans"`);
  }
}
