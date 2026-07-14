import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoryVersioningAndHierarchy1772530000000 implements MigrationInterface {
  name = "CreateCategoryVersioningAndHierarchy1772530000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Category Versions table
    await queryRunner.query(`
      CREATE TABLE "category_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "name" character varying(200) NOT NULL,
        "description" text,
        "slug" character varying(200) NOT NULL,
        "parent_id" uuid,
        "seo" jsonb,
        "metadata" jsonb,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_category_versions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // 2. Create Category Reviews table
    await queryRunner.query(`
      CREATE TABLE "category_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "category_version_id" uuid NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'PENDING',
        "policy" character varying(50) NOT NULL DEFAULT 'SINGLE_APPROVER',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_reviews" PRIMARY KEY ("id")
      )
    `);

    // 3. Create Category Review Assignments table
    await queryRunner.query(`
      CREATE TABLE "category_review_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "review_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'PENDING',
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_category_review_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_category_review_assignments" UNIQUE ("review_id", "reviewer_id"),
        CONSTRAINT "FK_category_review_assignments_reviewer" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 4. Create Category Review Comments table
    await queryRunner.query(`
      CREATE TABLE "category_review_comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "review_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "action" character varying(50) NOT NULL,
        "comment" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_review_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_category_review_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 5. Add new columns to categories
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD COLUMN "status" character varying(50) NOT NULL DEFAULT 'INACTIVE',
      ADD COLUMN "active_version_id" uuid,
      ADD COLUMN "parent_id" uuid,
      ADD COLUMN "level" integer NOT NULL DEFAULT 0,
      ADD COLUMN "path" character varying(1000),
      ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0,
      ADD COLUMN "tender_count" integer NOT NULL DEFAULT 0,
      ADD COLUMN "children_count" integer NOT NULL DEFAULT 0,
      ADD COLUMN "active_children" integer NOT NULL DEFAULT 0,
      ADD COLUMN "is_system" boolean NOT NULL DEFAULT false,
      ADD COLUMN "display_order" integer NOT NULL DEFAULT 0,
      ADD COLUMN "icon" character varying(100),
      ADD COLUMN "color" character varying(50),
      ADD COLUMN "approved_by" uuid,
      ADD COLUMN "db_version" integer NOT NULL DEFAULT 1
    `);

    // Add late foreign keys to avoid order of creation issues
    await queryRunner.query(`
      ALTER TABLE "category_versions" 
      ADD CONSTRAINT "FK_category_versions_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "FK_category_versions_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "category_reviews" 
      ADD CONSTRAINT "FK_category_reviews_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "FK_category_reviews_version" FOREIGN KEY ("category_version_id") REFERENCES "category_versions"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "category_review_assignments" 
      ADD CONSTRAINT "FK_category_review_assignments_review" FOREIGN KEY ("review_id") REFERENCES "category_reviews"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "category_review_comments" 
      ADD CONSTRAINT "FK_category_review_comments_review" FOREIGN KEY ("review_id") REFERENCES "category_reviews"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_active_version" FOREIGN KEY ("active_version_id") REFERENCES "category_versions"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_categories_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // 6. Migrate existing categories to category_versions
    await queryRunner.query(`
      INSERT INTO "category_versions" ("id", "category_id", "version", "name", "description", "slug", "parent_id", "created_by", "created_at", "updated_at")
      SELECT gen_random_uuid(), "id", 1, "name", COALESCE("description", ''), "slug", NULL, "created_by", "created_at", "updated_at" FROM "categories"
    `);

    // 7. Connect the versions to categories and update status/path
    await queryRunner.query(`
      UPDATE "categories" c
      SET "active_version_id" = (SELECT "id" FROM "category_versions" cv WHERE cv."category_id" = c."id" LIMIT 1),
          "status" = CASE WHEN c."is_active" = true THEN 'ACTIVE' ELSE 'INACTIVE' END,
          "path" = '/' || c."code"
    `);

    // 8. Calculate tender counts for existing categories (migrate existing associations)
    await queryRunner.query(`
      UPDATE "categories" c
      SET "tender_count" = COALESCE((
        SELECT COUNT(*)::int
        FROM "tender_versions" tv
        WHERE tv."category_id" = c."id"
      ), 0)
    `);

    // 9. Drop old columns and constraints from categories
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_categories_slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_slug_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "is_deleted"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD COLUMN "name" character varying(200),
      ADD COLUMN "description" text,
      ADD COLUMN "slug" character varying(200),
      ADD COLUMN "is_active" boolean DEFAULT true,
      ADD COLUMN "is_deleted" boolean DEFAULT false
    `);

    // Populate old columns from active version
    await queryRunner.query(`
      UPDATE "categories" c
      SET "name" = cv."name",
          "description" = cv."description",
          "slug" = cv."slug",
          "is_active" = CASE WHEN c."status" = 'ACTIVE' THEN true ELSE false END,
          "is_deleted" = CASE WHEN c."status" = 'ARCHIVED' THEN true ELSE false END
      FROM "category_versions" cv
      WHERE c."active_version_id" = cv."id"
    `);

    // Drop new constraints on categories
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_approved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_active_version"`,
    );

    // Drop columns from categories
    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN "status",
      DROP COLUMN "active_version_id",
      DROP COLUMN "parent_id",
      DROP COLUMN "level",
      DROP COLUMN "path",
      DROP COLUMN "sort_order",
      DROP COLUMN "tender_count",
      DROP COLUMN "children_count",
      DROP COLUMN "active_children",
      DROP COLUMN "is_system",
      DROP COLUMN "display_order",
      DROP COLUMN "icon",
      DROP COLUMN "color",
      DROP COLUMN "approved_by",
      DROP COLUMN "db_version"
    `);

    // Drop review comments, assignments, reviews, versions
    await queryRunner.query(`DROP TABLE IF EXISTS "category_review_comments"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "category_review_assignments"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "category_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category_versions"`);

    // Re-add unique constraints
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")`,
    );
  }
}
