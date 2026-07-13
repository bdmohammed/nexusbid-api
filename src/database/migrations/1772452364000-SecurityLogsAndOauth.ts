import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityLogsAndOauth1772452364000 implements MigrationInterface {
  name = 'SecurityLogsAndOauth1772452364000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add fields to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email_changed_at" TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN "google_id" VARCHAR DEFAULT NULL,
      ADD COLUMN "github_id" VARCHAR DEFAULT NULL,
      ADD COLUMN "microsoft_id" VARCHAR DEFAULT NULL
    `);

    // 2. Create security_logs table
    await queryRunner.query(`
      CREATE TABLE "security_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID DEFAULT NULL,
        "email" VARCHAR DEFAULT NULL,
        "event" VARCHAR NOT NULL,
        "ip_address" VARCHAR DEFAULT NULL,
        "user_agent" VARCHAR DEFAULT NULL,
        "location" VARCHAR DEFAULT NULL,
        "details" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_security_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_security_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_security_user_date" ON "security_logs"("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_security_email_date" ON "security_logs"("email", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "idx_security_email_date"`);
    await queryRunner.query(`DROP INDEX "idx_security_user_date"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "security_logs"`);

    // Drop user columns
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "microsoft_id",
      DROP COLUMN "github_id",
      DROP COLUMN "google_id",
      DROP COLUMN "email_changed_at"
    `);
  }
}
