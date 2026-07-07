import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActionableNotificationsSchema1772510000000 implements MigrationInterface {
  name = 'ActionableNotificationsSchema1772510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop existing notifications table and its related index and enum
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notif_user_read"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum" CASCADE`);

    // 2. Create the enhanced notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "category"     VARCHAR(50) NOT NULL,
        "severity"     VARCHAR(50) NOT NULL,
        "title"        TEXT NOT NULL,
        "message"      TEXT NOT NULL,
        "entity_type"  VARCHAR(100),
        "entity_id"    VARCHAR(100),
        "action_url"   VARCHAR(255),
        "action_label" VARCHAR(100),
        "expires_at"   TIMESTAMPTZ,
        "metadata"     JSONB,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 3. Create the notification recipients table
    await queryRunner.query(`
      CREATE TABLE "notification_recipients" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "notification_id" UUID NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
        "user_id"         UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id"         UUID REFERENCES "roles"("id") ON DELETE CASCADE,
        "group_name"      VARCHAR(100),
        "status"          VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
        "read_at"         TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 4. Create the notification actions table
    await queryRunner.query(`
      CREATE TABLE "notification_actions" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "notification_id" UUID NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
        "label"           VARCHAR(100) NOT NULL,
        "type"            VARCHAR(100) NOT NULL,
        "payload"         JSONB,
        "permission"      VARCHAR(100),
        "btn_order"       INTEGER DEFAULT 0
      )
    `);

    // 5. Add indexes for performance optimization
    await queryRunner.query(`CREATE INDEX "idx_notif_recip_user" ON "notification_recipients" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_notif_recip_role" ON "notification_recipients" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "idx_notif_recip_status" ON "notification_recipients" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_notif_created_at" ON "notifications" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notif_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notif_recip_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notif_recip_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notif_recip_user"`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_actions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_recipients" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);

    // Recreate original notifications enum and table to allow rollsback
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum" AS ENUM(
        'new_tender','tender_updated','deadline_reminder',
        'subscription_expiring','payment_success','payment_failed'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type"       "public"."notifications_type_enum" NOT NULL,
        "title"      TEXT NOT NULL,
        "body"       TEXT NOT NULL,
        "tender_id"  UUID REFERENCES "tenders"("id") ON DELETE SET NULL,
        "is_read"    BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notif_user_read" ON "notifications" ("user_id", "is_read")`);
  }
}
