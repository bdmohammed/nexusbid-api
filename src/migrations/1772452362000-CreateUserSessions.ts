import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSessions1772452362000 implements MigrationInterface {
  name = 'CreateUserSessions1772452362000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // 1. Add login failure and lockout columns to users table
      await queryRunner.query(
        'ALTER TABLE "users" ADD "failed_login_attempts" INTEGER NOT NULL DEFAULT 0',
      );
      await queryRunner.query('ALTER TABLE "users" ADD "lockout_until" TIMESTAMPTZ DEFAULT NULL');

      // 2. Create user_sessions table
      await queryRunner.query(`
        CREATE TABLE "user_sessions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "token_hash" VARCHAR(255) NOT NULL UNIQUE,
          "expires_at" TIMESTAMPTZ NOT NULL,
          "user_agent" VARCHAR(255) DEFAULT NULL,
          "ip_address" VARCHAR(100) DEFAULT NULL,
          "is_revoked" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      // 3. Create indexes
      await queryRunner.query(
        'CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" ("user_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_user_sessions_token_hash" ON "user_sessions" ("token_hash")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" ("expires_at")',
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // 1. Drop indexes
      await queryRunner.query('DROP INDEX IF EXISTS "idx_user_sessions_expires_at"');
      await queryRunner.query('DROP INDEX IF EXISTS "idx_user_sessions_token_hash"');
      await queryRunner.query('DROP INDEX IF EXISTS "idx_user_sessions_user_id"');

      // 2. Drop table
      await queryRunner.query('DROP TABLE IF EXISTS "user_sessions" CASCADE');

      // 3. Drop columns from users table
      await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "lockout_until"');
      await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "failed_login_attempts"');

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
