import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileColumnsToUser1772458000000 implements MigrationInterface {
  name = "AddProfileColumnsToUser1772458000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "avatar_url" VARCHAR(255) DEFAULT NULL,
      ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN "two_factor_secret" VARCHAR DEFAULT NULL,
      ADD COLUMN "two_factor_recovery_codes" TEXT DEFAULT NULL,
      ADD COLUMN "notification_preferences" JSONB NOT NULL DEFAULT '{"email": true, "push": true, "sms": false, "marketing": false, "security": true, "tender": true, "newsletter": false}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "notification_preferences",
      DROP COLUMN "two_factor_recovery_codes",
      DROP COLUMN "two_factor_secret",
      DROP COLUMN "two_factor_enabled",
      DROP COLUMN "avatar_url"
    `);
  }
}
