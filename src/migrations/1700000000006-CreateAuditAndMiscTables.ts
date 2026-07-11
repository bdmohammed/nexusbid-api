import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditAndMiscTables1700000000006 implements MigrationInterface {
  name = 'CreateAuditAndMiscTables1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Notifications
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum" AS ENUM(
        'new_tender','tender_updated','deadline_reminder',
        'subscription_expiring','payment_success','payment_failed'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"    UUID NOT NULL REFERENCES "users"("id")   ON DELETE CASCADE,
        "type"       "public"."notifications_type_enum" NOT NULL,
        "title"      TEXT NOT NULL,
        "body"       TEXT NOT NULL,
        "tender_id"  UUID          REFERENCES "tenders"("id") ON DELETE SET NULL,
        "is_read"    BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_notif_user_read" ON "notifications" ("user_id", "is_read")',
    );

    // Support tickets
    await queryRunner.query(`
      CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('open','in_progress','resolved','closed')
    `);
    await queryRunner.query(`
      CREATE TABLE "support_tickets" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"       UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "subject"       TEXT NOT NULL,
        "message"       TEXT NOT NULL,
        "status"        "public"."support_tickets_status_enum" NOT NULL DEFAULT 'open',
        "assigned_to_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "admin_reply"   TEXT,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Static pages (CMS)
    await queryRunner.query(`
      CREATE TABLE "static_pages" (
        "id"               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "slug"             TEXT NOT NULL UNIQUE,
        "title"            TEXT NOT NULL,
        "content"          TEXT NOT NULL,
        "meta_description" TEXT,
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Audit logs (immutable — no UPDATE/DELETE ever)
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "actor_id"     UUID,
        "actor_email"  TEXT NOT NULL,
        "action"       TEXT NOT NULL,
        "entity_type"  TEXT NOT NULL,
        "entity_id"    TEXT,
        "before"       JSONB,
        "after"        JSONB,
        "ip_address"   TEXT,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_audit_actor_date" ON "audit_logs" ("actor_id", "created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_audit_entity"     ON "audit_logs" ("entity_type", "entity_id")',
    );

    // Webhook events (idempotency store)
    await queryRunner.query(`
      CREATE TYPE "public"."webhook_events_status_enum" AS ENUM(
        'received','processing','processed','failed','ignored'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "webhook_events" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "provider"     TEXT NOT NULL,
        "event_id"     TEXT NOT NULL,
        "event_type"   TEXT NOT NULL,
        "payload"      JSONB NOT NULL,
        "status"       "public"."webhook_events_status_enum" NOT NULL DEFAULT 'received',
        "error"        TEXT,
        "processed_at" TIMESTAMPTZ,
        "received_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "idx_webhook_provider_event" UNIQUE ("provider", "event_id")
      )
    `);

    // Feature flags
    await queryRunner.query(`
      CREATE TABLE "feature_flags" (
        "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "key"        TEXT    NOT NULL UNIQUE,
        "label"      TEXT    NOT NULL,
        "enabled"    BOOLEAN NOT NULL DEFAULT false,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Email tokens
    await queryRunner.query(`
      CREATE TYPE "public"."email_tokens_type_enum" AS ENUM('email_verification', 'password_reset')
    `);
    await queryRunner.query(`
      CREATE TABLE "email_tokens" (
        "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" TEXT NOT NULL,
        "type"       "public"."email_tokens_type_enum" NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at"    TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "email_tokens"');
    await queryRunner.query('DROP TYPE "public"."email_tokens_type_enum"');
    await queryRunner.query('DROP TABLE "feature_flags"');
    await queryRunner.query('DROP TABLE "webhook_events"');
    await queryRunner.query('DROP TYPE "public"."webhook_events_status_enum"');
    await queryRunner.query('DROP TABLE "audit_logs"');
    await queryRunner.query('DROP TABLE "static_pages"');
    await queryRunner.query('DROP TABLE "support_tickets"');
    await queryRunner.query('DROP TYPE "public"."support_tickets_status_enum"');
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query('DROP TYPE "public"."notifications_type_enum"');
  }
}
