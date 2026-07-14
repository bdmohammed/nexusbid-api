import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceAuditLogs1772490000000 implements MigrationInterface {
  name = "EnhanceAuditLogs1772490000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Upgrade audit_logs table
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS "correlation_id" UUID,
      ADD COLUMN IF NOT EXISTS "actor_user_id" UUID,
      ADD COLUMN IF NOT EXISTS "target_user_id" UUID,
      ADD COLUMN IF NOT EXISTS "module" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "severity" VARCHAR(50) DEFAULT 'INFO',
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'SUCCESS',
      ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(255)
    `);

    // 2. Add new Indexes
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
      CREATE INDEX "idx_audit_logs_actor_user_id" ON "audit_logs" ("actor_user_id");
      CREATE INDEX "idx_audit_logs_target_user_id" ON "audit_logs" ("target_user_id");
      CREATE INDEX "idx_audit_logs_module" ON "audit_logs" ("module");
      CREATE INDEX "idx_audit_logs_severity" ON "audit_logs" ("severity");
      CREATE INDEX "idx_audit_logs_correlation_id" ON "audit_logs" ("correlation_id");
      CREATE INDEX "idx_audit_logs_request_id" ON "audit_logs" ("request_id");
      CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs" ("entity_id");
    `);

    // 3. Create audit_retention_policies table
    await queryRunner.query(`
      CREATE TABLE "audit_retention_policies" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "category" VARCHAR(50) UNIQUE NOT NULL,
        "retention_days" INTEGER NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_retention_policies"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_request_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_audit_logs_correlation_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_severity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_module"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_audit_logs_target_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_audit_logs_actor_user_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "session_id",
      DROP COLUMN IF EXISTS "metadata",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "severity",
      DROP COLUMN IF EXISTS "module",
      DROP COLUMN IF EXISTS "target_user_id",
      DROP COLUMN IF EXISTS "actor_user_id",
      DROP COLUMN IF EXISTS "correlation_id",
      DROP COLUMN IF EXISTS "event_id"
    `);
  }
}
