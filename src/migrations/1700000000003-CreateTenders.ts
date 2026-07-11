import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenders1700000000003 implements MigrationInterface {
  name = 'CreateTenders1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."tenders_status_enum" AS ENUM(
        'draft', 'under_review', 'active', 'expired', 'closed', 'archived'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."tenders_submission_type_enum" AS ENUM(
        'digital', 'physical', 'both'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tenders" (
        "id"                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "title"                  VARCHAR(400) NOT NULL,
        "slug"                   TEXT         NOT NULL UNIQUE,
        "ref_number"             TEXT         NOT NULL UNIQUE,
        "description"            TEXT         NOT NULL,
        "city"                   TEXT,
        "agency"                 VARCHAR(300) NOT NULL,
        "eligibility"            TEXT,
        "contact_info"           TEXT,
        "submission_type"        "public"."tenders_submission_type_enum" NOT NULL DEFAULT 'digital',
        "status"                 "public"."tenders_status_enum"          NOT NULL DEFAULT 'draft',
        "posted_date"            DATE         NOT NULL,
        "deadline"               TIMESTAMPTZ  NOT NULL,
        "document_s3_key"        TEXT,
        "document_s3_bucket"     TEXT,
        "document_original_name" TEXT,
        "price_cents"            INTEGER      NOT NULL DEFAULT 999,
        "is_featured"            BOOLEAN      NOT NULL DEFAULT false,
        "rejection_note"         TEXT,
        "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"             TIMESTAMPTZ,
        "category_id"            UUID         NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "state_id"               UUID         NOT NULL REFERENCES "states"("id")     ON DELETE RESTRICT,
        "created_by_id"          UUID                  REFERENCES "users"("id")      ON DELETE SET NULL,
        CONSTRAINT "chk_tenders_price_positive" CHECK ("price_cents" >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_tenders_status_cat"   ON "tenders" ("status", "category_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_tenders_status_state" ON "tenders" ("status", "state_id")',
    );
    await queryRunner.query('CREATE INDEX "idx_tenders_deadline"     ON "tenders" ("deadline")');
    await queryRunner.query('CREATE INDEX "idx_tenders_featured"     ON "tenders" ("is_featured")');
    await queryRunner.query('CREATE UNIQUE INDEX "idx_tenders_slug"  ON "tenders" ("slug")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tenders"');
    await queryRunner.query('DROP TYPE "public"."tenders_submission_type_enum"');
    await queryRunner.query('DROP TYPE "public"."tenders_status_enum"');
  }
}
