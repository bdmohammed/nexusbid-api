import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1700000000001 implements MigrationInterface {
  name = "CreateUsers1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."users_admin_role_enum" AS ENUM(
        'super_admin', 'tender_manager', 'content_moderator',
        'subscription_manager', 'support', 'analytics'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"            VARCHAR(120)  NOT NULL,
        "email"           VARCHAR(160)  NOT NULL UNIQUE,
        "password_hash"   TEXT          NOT NULL,
        "role"            "public"."users_role_enum" NOT NULL DEFAULT 'customer',
        "admin_role"      "public"."users_admin_role_enum",
        "company_name"    VARCHAR(160),
        "country"         VARCHAR(100),
        "email_verified"  BOOLEAN NOT NULL DEFAULT false,
        "is_blocked"      BOOLEAN NOT NULL DEFAULT false,
        "token_version"   INTEGER NOT NULL DEFAULT 1,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_role" ON "users" ("role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_admin_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
