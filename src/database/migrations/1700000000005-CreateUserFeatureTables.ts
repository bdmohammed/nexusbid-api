import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserFeatureTables1700000000005 implements MigrationInterface {
  name = "CreateUserFeatureTables1700000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Admin permissions
    await queryRunner.query(`
      CREATE TYPE "public"."admin_permissions_key_enum" AS ENUM(
        'create_tender','edit_tender','delete_tender','upload_pdf','approve_tender',
        'manage_categories','manage_states',
        'view_subscriptions','process_refunds','manage_plans',
        'view_users','block_users',
        'view_tickets','reply_tickets',
        'view_analytics','export_analytics',
        'edit_cms','manage_settings','create_admin','assign_permissions',
        'manage_feature_flags','view_audit_logs','manage_cron'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "admin_permissions" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "admin_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "permission_key" "public"."admin_permissions_key_enum" NOT NULL,
        "allowed"        BOOLEAN NOT NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_admin_permissions_admin_key" UNIQUE ("admin_id", "permission_key")
      )
    `);

    // Saved tenders
    await queryRunner.query(`
      CREATE TABLE "saved_tenders" (
        "id"        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"   UUID NOT NULL REFERENCES "users"("id")   ON DELETE CASCADE,
        "tender_id" UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "saved_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_saved_tenders_user_tender" UNIQUE ("user_id", "tender_id")
      )
    `);

    // Alert preferences
    await queryRunner.query(`
      CREATE TYPE "public"."alert_preferences_frequency_enum" AS ENUM('daily', 'weekly')
    `);
    await queryRunner.query(`
      CREATE TABLE "alert_preferences" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"     UUID NOT NULL REFERENCES "users"("id")       ON DELETE CASCADE,
        "category_id" UUID          REFERENCES "categories"("id")  ON DELETE SET NULL,
        "state_id"    UUID          REFERENCES "states"("id")      ON DELETE SET NULL,
        "keyword"     TEXT,
        "frequency"   "public"."alert_preferences_frequency_enum" NOT NULL DEFAULT 'daily',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Download history
    await queryRunner.query(`
      CREATE TABLE "download_history" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"       UUID REFERENCES "users"("id")   ON DELETE SET NULL,
        "tender_id"     UUID REFERENCES "tenders"("id") ON DELETE SET NULL,
        "file_name"     TEXT        NOT NULL,
        "file_size"     INTEGER,
        "ip_address"    TEXT,
        "downloaded_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_downloads_user_date" ON "download_history" ("user_id", "downloaded_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "download_history"`);
    await queryRunner.query(`DROP TABLE "alert_preferences"`);
    await queryRunner.query(
      `DROP TYPE "public"."alert_preferences_frequency_enum"`,
    );
    await queryRunner.query(`DROP TABLE "saved_tenders"`);
    await queryRunner.query(`DROP TABLE "admin_permissions"`);
    await queryRunner.query(`DROP TYPE "public"."admin_permissions_key_enum"`);
  }
}
