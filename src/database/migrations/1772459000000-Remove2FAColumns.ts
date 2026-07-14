import type { MigrationInterface, QueryRunner } from "typeorm";

export class Remove2FAColumns1772459000000 implements MigrationInterface {
  name = "Remove2FAColumns1772459000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "two_factor_recovery_codes",
      DROP COLUMN IF EXISTS "two_factor_secret",
      DROP COLUMN IF EXISTS "two_factor_enabled"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN "two_factor_secret" VARCHAR DEFAULT NULL,
      ADD COLUMN "two_factor_recovery_codes" TEXT DEFAULT NULL
    `);
  }
}
