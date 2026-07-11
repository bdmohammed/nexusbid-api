import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceRBAC1772452367000 implements MigrationInterface {
  name = 'EnhanceRBAC1772452367000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // 0. Alter notifications type enum
      await queryRunner.query(
        'ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS \'role_workflow\'',
      );

      // 1. Alter Roles Table — Add columns (make nullable initially to support migration)
      await queryRunner.query('ALTER TABLE "roles" ADD "status" VARCHAR(50) DEFAULT \'ACTIVE\'');
      await queryRunner.query('ALTER TABLE "roles" ADD "active_version_id" UUID DEFAULT NULL');
      await queryRunner.query('ALTER TABLE "roles" ADD "is_default_role" BOOLEAN DEFAULT FALSE');

      // 2. Create role_versions table
      await queryRunner.query(`
        CREATE TABLE "role_versions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
          "version" INTEGER NOT NULL DEFAULT 1,
          "name" VARCHAR(100) NOT NULL,
          "description" TEXT DEFAULT NULL,
          "status" VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
          "locked_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
          "locked_at" TIMESTAMPTZ DEFAULT NULL,
          "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "uq_role_versions_role_version" UNIQUE ("role_id", "version")
        )
      `);

      // 3. Create role_version_permissions table
      await queryRunner.query(`
        CREATE TABLE "role_version_permissions" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "role_version_id" UUID NOT NULL REFERENCES "role_versions"("id") ON DELETE CASCADE,
          "permission_key" VARCHAR(100) NOT NULL,
          "permission_name" VARCHAR(100) NOT NULL,
          "module_slug" VARCHAR(100) NOT NULL,
          "module_name" VARCHAR(100) NOT NULL,
          CONSTRAINT "uq_role_version_permissions_version_key" UNIQUE ("role_version_id", "permission_key")
        )
      `);

      // 4. Create role_reviews table
      await queryRunner.query(`
        CREATE TABLE "role_reviews" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
          "role_version_id" UUID NOT NULL REFERENCES "role_versions"("id") ON DELETE CASCADE,
          "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      // 5. Create role_review_assignments table
      await queryRunner.query(`
        CREATE TABLE "role_review_assignments" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "review_id" UUID NOT NULL REFERENCES "role_reviews"("id") ON DELETE CASCADE,
          "reviewer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "reviewed_at" TIMESTAMPTZ DEFAULT NULL,
          CONSTRAINT "uq_review_assignments_reviewer" UNIQUE ("review_id", "reviewer_id")
        )
      `);

      // 6. Create role_review_comments table
      await queryRunner.query(`
        CREATE TABLE "role_review_comments" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "review_id" UUID NOT NULL REFERENCES "role_reviews"("id") ON DELETE CASCADE,
          "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "action" VARCHAR(50) NOT NULL,
          "comment" TEXT NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      // 7. Data Migration: Create Version 1 for all existing roles
      await queryRunner.query(`
        INSERT INTO "role_versions" (
          "id", "role_id", "version", "name", "description", "status", "created_by", "created_at", "updated_at"
        )
        SELECT 
          gen_random_uuid(), "id", 1, "name", "description", 'APPROVED', "created_by", "created_at", "updated_at"
        FROM "roles"
      `);

      // 8. Data Migration: Populate role_version_permissions from old role_permissions table
      await queryRunner.query(`
        INSERT INTO "role_version_permissions" (
          "id", "role_version_id", "permission_key", "permission_name", "module_slug", "module_name"
        )
        SELECT 
          gen_random_uuid(),
          rv.id,
          p.key,
          p.name,
          pm.slug,
          pm.name
        FROM "role_permissions" rp
        INNER JOIN "permissions" p ON rp.permission_id = p.id
        INNER JOIN "permission_modules" pm ON p.module_id = pm.id
        INNER JOIN "role_versions" rv ON rp.role_id = rv.role_id AND rv.version = 1
      `);

      // 9. Data Migration: Set active_version_id in roles
      await queryRunner.query(`
        UPDATE "roles" r
        SET "active_version_id" = (
          SELECT rv.id FROM "role_versions" rv WHERE rv.role_id = r.id AND rv.version = 1
        )
      `);

      // 10. Make status NOT NULL and add Foreign Key constraint for active_version_id
      await queryRunner.query('ALTER TABLE "roles" ALTER COLUMN "status" SET NOT NULL');
      await queryRunner.query(`
        ALTER TABLE "roles" 
        ADD CONSTRAINT "fk_roles_active_version" 
        FOREIGN KEY ("active_version_id") REFERENCES "role_versions"("id") ON DELETE SET NULL
      `);

      // 11. Drop replaced columns and tables
      await queryRunner.query('DROP TABLE IF EXISTS "role_permissions" CASCADE');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "name"');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "description"');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_active"');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "deleted_at"');

      // 12. Create Indexes
      await queryRunner.query(
        'CREATE INDEX "idx_role_versions_role" ON "role_versions" ("role_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_role_versions_status" ON "role_versions" ("status")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_role_version_permissions_version" ON "role_version_permissions" ("role_version_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_role_reviews_version" ON "role_reviews" ("role_version_id")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_role_reviews_status" ON "role_reviews" ("status")',
      );
      await queryRunner.query(
        'CREATE INDEX "idx_review_assignments_reviewer" ON "role_review_assignments" ("reviewer_id")',
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse operations
    await queryRunner.startTransaction();
    try {
      // Re-create dropped tables and columns first
      await queryRunner.query('ALTER TABLE "roles" ADD "name" VARCHAR(100)');
      await queryRunner.query('ALTER TABLE "roles" ADD "description" TEXT');
      await queryRunner.query('ALTER TABLE "roles" ADD "is_active" BOOLEAN DEFAULT TRUE');
      await queryRunner.query('ALTER TABLE "roles" ADD "deleted_at" TIMESTAMPTZ DEFAULT NULL');

      // Populate roles table data back from active version (or Version 1 if active is null)
      await queryRunner.query(`
        UPDATE "roles" r
        SET 
          "name" = COALESCE(
            (SELECT name FROM role_versions rv WHERE rv.id = r.active_version_id),
            (SELECT name FROM role_versions rv WHERE rv.role_id = r.id ORDER BY version DESC LIMIT 1),
            'Unnamed Role'
          ),
          "description" = COALESCE(
            (SELECT description FROM role_versions rv WHERE rv.id = r.active_version_id),
            (SELECT description FROM role_versions rv WHERE rv.role_id = r.id ORDER BY version DESC LIMIT 1)
          )
      `);

      // Ensure name is NOT NULL
      await queryRunner.query('ALTER TABLE "roles" ALTER COLUMN "name" SET NOT NULL');

      // Re-create old role_permissions table
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

      // Populate old role_permissions from snapshot
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT DISTINCT
          rv.role_id,
          p.id
        FROM "role_version_permissions" rvp
        INNER JOIN "role_versions" rv ON rvp.role_version_id = rv.id
        INNER JOIN "permissions" p ON rvp.permission_key = p.key
      `);

      // Drop new tables
      await queryRunner.query('DROP TABLE IF EXISTS "role_review_comments" CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS "role_review_assignments" CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS "role_reviews" CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS "role_version_permissions" CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS "role_versions" CASCADE');

      // Remove new columns and constraints from roles
      await queryRunner.query(
        'ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "fk_roles_active_version"',
      );
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "status"');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "active_version_id"');
      await queryRunner.query('ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_default_role"');

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
