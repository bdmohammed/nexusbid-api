import type { MigrationInterface, QueryRunner } from "typeorm";

export class SecurityBacklog1772452363000 implements MigrationInterface {
  name = "SecurityBacklog1772452363000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add fields to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_changed_at" TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN "must_reset_password" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN "pending_email" VARCHAR(160) DEFAULT NULL,
      ADD COLUMN "last_login_at" TIMESTAMPTZ DEFAULT NULL
    `);

    // 2. Create password_histories table
    await queryRunner.query(`
      CREATE TABLE "password_histories" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "password_hash" VARCHAR NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_histories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_histories_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_password_histories_user_id" ON "password_histories"("user_id")
    `);

    // 3. Create user_devices table
    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "device_hash" VARCHAR NOT NULL,
        "user_agent" VARCHAR DEFAULT NULL,
        "last_ip_address" VARCHAR DEFAULT NULL,
        "is_trusted" BOOLEAN NOT NULL DEFAULT FALSE,
        "last_active_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_devices_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_devices_user_id" ON "user_devices"("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_devices_device_hash" ON "user_devices"("device_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_devices indexes & table
    await queryRunner.query(`DROP INDEX "IDX_user_devices_device_hash"`);
    await queryRunner.query(`DROP INDEX "IDX_user_devices_user_id"`);
    await queryRunner.query(`DROP TABLE "user_devices"`);

    // Drop password_histories index & table
    await queryRunner.query(`DROP INDEX "IDX_password_histories_user_id"`);
    await queryRunner.query(`DROP TABLE "password_histories"`);

    // Remove users columns
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "last_login_at",
      DROP COLUMN "pending_email",
      DROP COLUMN "must_reset_password",
      DROP COLUMN "password_changed_at"
    `);
  }
}
