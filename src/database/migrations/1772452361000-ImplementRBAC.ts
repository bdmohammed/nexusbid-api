import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImplementRBAC1772452361000 implements MigrationInterface {
  name = 'ImplementRBAC1772452361000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // 1. Drop deprecated admin_permissions table
      await queryRunner.query(`DROP TABLE IF EXISTS "admin_permissions" CASCADE`);

      // 2. Add account_type column as nullable initially
      await queryRunner.query(`ALTER TABLE "users" ADD "account_type" VARCHAR(30) DEFAULT NULL`);

      // 3. Migrate existing data
      await queryRunner.query(`UPDATE "users" SET "account_type" = 'user' WHERE "role" = 'customer'`);
      await queryRunner.query(`UPDATE "users" SET "account_type" = 'admin' WHERE "role" = 'admin'`);

      // Fill in any nulls just in case
      await queryRunner.query(`UPDATE "users" SET "account_type" = 'user' WHERE "account_type" IS NULL`);

      // 4. Alter account_type to NOT NULL with default
      await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "account_type" SET NOT NULL`);
      await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "account_type" SET DEFAULT 'user'`);

      // 5. Drop legacy role and admin_role columns
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "admin_role"`);
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);

      // Drop old types & indexes
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_admin_role_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);

      // 6. Create Permission Modules table
      await queryRunner.query(`
        CREATE TABLE "permission_modules" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "name" VARCHAR(100) NOT NULL,
          "slug" VARCHAR(100) NOT NULL UNIQUE,
          "icon" VARCHAR(50) DEFAULT NULL,
          "display_order" INTEGER NOT NULL DEFAULT 0,
          "is_system_module" BOOLEAN NOT NULL DEFAULT false,
          "is_active" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMPTZ DEFAULT NULL
        )
      `);

      // 7. Create Permissions table
      await queryRunner.query(`
        CREATE TABLE "permissions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "module_id" UUID NOT NULL REFERENCES "permission_modules"("id") ON DELETE CASCADE,
          "name" VARCHAR(100) NOT NULL,
          "key" VARCHAR(100) NOT NULL UNIQUE,
          "action" VARCHAR(50) NOT NULL,
          "description" TEXT DEFAULT NULL,
          "display_order" INTEGER NOT NULL DEFAULT 0,
          "is_active" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMPTZ DEFAULT NULL
        )
      `);

      // 8. Create Roles table
      await queryRunner.query(`
        CREATE TABLE "roles" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "name" VARCHAR(100) NOT NULL UNIQUE,
          "slug" VARCHAR(100) NOT NULL UNIQUE,
          "description" TEXT DEFAULT NULL,
          "is_system_role" BOOLEAN NOT NULL DEFAULT false,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "created_by" UUID DEFAULT NULL REFERENCES "users"("id") ON DELETE SET NULL,
          "updated_by" UUID DEFAULT NULL REFERENCES "users"("id") ON DELETE SET NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMPTZ DEFAULT NULL
        )
      `);

      // 9. Create User Roles junction table
      await queryRunner.query(`
        CREATE TABLE "user_roles" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
          "assigned_by" UUID DEFAULT NULL REFERENCES "users"("id") ON DELETE SET NULL,
          "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "expires_at" TIMESTAMPTZ DEFAULT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "uq_user_roles_user_role" UNIQUE ("user_id", "role_id")
        )
      `);

      // 10. Create Role Permissions junction table
      await queryRunner.query(`
        CREATE TABLE "role_permissions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
          "permission_id" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "deleted_at" TIMESTAMPTZ DEFAULT NULL,
          CONSTRAINT "uq_role_permissions_role_permission" UNIQUE ("role_id", "permission_id")
        )
      `);

      // 11. Add AuditLog fields
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "request_id" VARCHAR(255) DEFAULT NULL`);
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "user_agent" VARCHAR(255) DEFAULT NULL`);

      // 12. Indexes
      await queryRunner.query(`CREATE INDEX "idx_users_account_type" ON "users" ("account_type")`);
      await queryRunner.query(`CREATE INDEX "idx_permission_modules_slug" ON "permission_modules" ("slug")`);
      await queryRunner.query(`CREATE INDEX "idx_permissions_key" ON "permissions" ("key")`);
      await queryRunner.query(`CREATE INDEX "idx_roles_slug" ON "roles" ("slug")`);
      await queryRunner.query(`CREATE INDEX "idx_user_roles_user" ON "user_roles" ("user_id")`);
      await queryRunner.query(`CREATE INDEX "idx_user_roles_role" ON "user_roles" ("role_id")`);
      await queryRunner.query(`CREATE INDEX "idx_role_permissions_role" ON "role_permissions" ("role_id")`);
      await queryRunner.query(`CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" ("permission_id")`);

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
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_role_permissions_permission"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_role_permissions_role"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_roles_role"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_roles_user"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_roles_slug"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissions_key"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_modules_slug"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_account_type"`);

      // 2. Remove AuditLog fields
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "request_id"`);
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_agent"`);

      // 3. Drop tables in reverse order
      await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "permission_modules" CASCADE`);

      // 4. Re-create enums
      await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'admin')`);
      await queryRunner.query(`
        CREATE TYPE "public"."users_admin_role_enum" AS ENUM(
          'super_admin', 'tender_manager', 'content_moderator',
          'subscription_manager', 'support', 'analytics'
        )
      `);

      // 5. Restore role and admin_role columns
      await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer'`);
      await queryRunner.query(`ALTER TABLE "users" ADD "admin_role" "public"."users_admin_role_enum" DEFAULT NULL`);

      // 6. Restore data
      await queryRunner.query(`UPDATE "users" SET "role" = 'customer' WHERE "account_type" = 'user'`);
      await queryRunner.query(`UPDATE "users" SET "role" = 'admin', "admin_role" = 'super_admin' WHERE "account_type" = 'admin'`);

      // 7. Drop account_type column
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "account_type"`);

      // 8. Re-create old index
      await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role")`);

      // 9. Re-create admin_permissions
      await queryRunner.query(`
        CREATE TABLE "admin_permissions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "admin_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "permission_key" VARCHAR(100) NOT NULL,
          "allowed" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
