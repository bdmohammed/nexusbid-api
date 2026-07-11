import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnterpriseTenders1772460000000 implements MigrationInterface {
  name = 'CreateEnterpriseTenders1772460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create DB sequence for Tender references
    await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS tender_ref_seq START WITH 100001;');

    // 2. Create the tender_versions table
    await queryRunner.query(`
      CREATE TABLE "tender_versions" (
        "id"                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"               UUID NOT NULL,
        "version"                 INTEGER NOT NULL DEFAULT 1,
        "status"                  VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "db_version"              INTEGER NOT NULL DEFAULT 1,
        "title"                   VARCHAR(400) NOT NULL,
        "description"             TEXT NOT NULL,
        "procurement_type"        VARCHAR(50),
        "priority"                VARCHAR(50) DEFAULT 'Medium',
        "estimated_budget"        BIGINT,
        "currency"                VARCHAR(10) DEFAULT 'USD',
        "department"              VARCHAR(255),
        "place_id"                TEXT,
        "formatted_address"       TEXT,
        "site_visit_required"     BOOLEAN DEFAULT false,
        "site_visit_date"         TIMESTAMPTZ,
        "site_visit_instructions" TEXT,
        "contact_person"          VARCHAR(255),
        "contact_designation"     VARCHAR(255),
        "contact_email"           VARCHAR(255),
        "contact_phone"           VARCHAR(50),
        "contact_alternative"     VARCHAR(255),
        "opening_date"            TIMESTAMPTZ,
        "closing_date"            TIMESTAMPTZ,
        "bid_validity"            INTEGER,
        "project_duration"        VARCHAR(100),
        "emd_amount"              BIGINT,
        "security_deposit"        BIGINT,
        "payment_terms"           TEXT,
        "visibility"              VARCHAR(50) DEFAULT 'public',
        "evaluation_method"       VARCHAR(100),
        "submission_method"       VARCHAR(100),
        "contract_type"           VARCHAR(100),
        "procurement_method"      VARCHAR(100),
        "eligibility_criteria"    TEXT,
        "special_conditions"      TEXT,
        "category_id"             UUID REFERENCES "categories"("id") ON DELETE RESTRICT,
        "state_id"                UUID REFERENCES "states"("id") ON DELETE RESTRICT,
        "created_by_id"           UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 3. Add temporary columns to tenders for reference conversion, or map them
    await queryRunner.query('ALTER TABLE "tenders" ADD COLUMN "active_version_id" UUID;');
    await queryRunner.query('ALTER TABLE "tenders" ADD COLUMN "reference_no" VARCHAR(100) UNIQUE;');
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD COLUMN "lifecycle_status" VARCHAR(50) DEFAULT \'ACTIVE\';',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD COLUMN "publication_status" VARCHAR(50) DEFAULT \'PUBLISHED\';',
    );

    // 4. Migrate existing data from tenders to tender_versions
    const oldTenders = await queryRunner.query('SELECT * FROM "tenders"');
    for (const ot of oldTenders) {
      const vId = ot.id; // Or generate a new UUID
      const versionId = 'gen_random_uuid()';
      const versionStatus =
        ot.status === 'under_review'
          ? 'UNDER_REVIEW'
          : ot.status === 'draft'
            ? 'DRAFT'
            : 'APPROVED';
      const pubStatus =
        ot.status === 'active'
          ? 'PUBLISHED'
          : ot.status === 'draft'
            ? 'SCHEDULED'
            : ot.status.toUpperCase();
      const lifecycleStatus = ot.status === 'archived' ? 'ARCHIVED' : 'ACTIVE';
      const refNo = ot.ref_number ?? `TDR-2026-${Math.floor(Math.random() * 900000 + 100000)}`;

      // Insert version
      const inserted = await queryRunner.query(
        `
        INSERT INTO "tender_versions" (
          "tender_id", "version", "status", "title", "description", "formatted_address", "agency",
          "eligibility_criteria", "contact_person", "opening_date", "closing_date", "estimated_budget",
          "category_id", "state_id", "created_by_id", "created_at"
        ) VALUES (
          '${ot.id}', 1, '${versionStatus}', $1, $2, $3, $4, $5, $6, $7, $8, $9,
          '${ot.category_id}', '${ot.state_id}', ${ot.created_by_id ? `'${ot.created_by_id}'` : 'NULL'}, '${ot.created_at.toISOString()}'
        ) RETURNING id
      `,
        [
          ot.title,
          ot.description,
          ot.city ?? '',
          ot.agency ?? '',
          ot.eligibility ?? '',
          ot.contact_info ?? '',
          ot.posted_date ? new Date(ot.posted_date).toISOString() : new Date().toISOString(),
          ot.deadline ? new Date(ot.deadline).toISOString() : new Date().toISOString(),
          ot.priceCents ?? 0,
        ],
      );

      const newVersionId = inserted[0].id;

      // Update tender
      await queryRunner.query(
        `
        UPDATE "tenders" SET
          "active_version_id" = '${newVersionId}',
          "reference_no" = $1,
          "lifecycle_status" = '${lifecycleStatus}',
          "publication_status" = '${pubStatus}'
        WHERE "id" = '${ot.id}'
      `,
        [refNo],
      );

      // Copy document to new documents table if exists
      if (ot.document_s3_key) {
        await queryRunner.query(
          `
          INSERT INTO "tender_documents" (
            "tender_version_id", "document_type", "s3_key", "bucket", "original_name",
            "virus_scan_status", "is_public", "uploaded_by_id"
          ) VALUES (
            '${newVersionId}', 'Notice', $1, $2, $3, 'Clean', true, ${ot.created_by_id ? `'${ot.created_by_id}'` : 'NULL'}
          )
        `,
          [
            ot.document_s3_key,
            ot.document_s3_bucket ?? 'nexusbid-tenders',
            ot.document_original_name ?? 'document.pdf',
          ],
        );
      }
    }

    // 5. Drop old columns from tenders
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "title";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "slug";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "ref_number";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "description";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "city";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "agency";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "eligibility";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "contact_info";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "submission_type";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "posted_date";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "deadline";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "document_s3_key";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "document_s3_bucket";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "document_original_name";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "price_cents";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "is_featured";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "rejection_note";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "deleted_at";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "category_id";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "state_id";');
    await queryRunner.query('ALTER TABLE "tenders" DROP COLUMN "status";');

    // Rename publication_status and lifecycle_status to status
    await queryRunner.query('ALTER TABLE "tenders" RENAME COLUMN "lifecycle_status" TO "status";');

    // Set foreign keys constraint
    await queryRunner.query(
      'ALTER TABLE "tender_versions" ADD CONSTRAINT "fk_tender_versions_tenders" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE;',
    );
    await queryRunner.query(
      'ALTER TABLE "tenders" ADD CONSTRAINT "fk_tenders_active_version" FOREIGN KEY ("active_version_id") REFERENCES "tender_versions"("id") ON DELETE SET NULL;',
    );

    // Create other supporting tables
    // 6. tender_documents
    await queryRunner.query(`
      CREATE TABLE "tender_documents" (
        "id"                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_version_id" UUID NOT NULL REFERENCES "tender_versions"("id") ON DELETE CASCADE,
        "document_type"     VARCHAR(50) NOT NULL,
        "s3_key"            TEXT NOT NULL,
        "bucket"            TEXT NOT NULL,
        "original_name"     TEXT NOT NULL,
        "mime_type"         VARCHAR(150),
        "file_size"         INTEGER,
        "version"           INTEGER NOT NULL DEFAULT 1,
        "checksum"          VARCHAR(64),
        "virus_scan_status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
        "is_public"         BOOLEAN NOT NULL DEFAULT true,
        "download_count"    INTEGER NOT NULL DEFAULT 0,
        "uploaded_by_id"    UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "uploaded_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 7. tender_reviews
    await queryRunner.query(`
      CREATE TABLE "tender_reviews" (
        "id"                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_version_id" UUID NOT NULL REFERENCES "tender_versions"("id") ON DELETE CASCADE,
        "status"            VARCHAR(50) NOT NULL DEFAULT 'assigned',
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 8. tender_review_assignments
    await queryRunner.query(`
      CREATE TABLE "tender_review_assignments" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "review_id"   UUID NOT NULL REFERENCES "tender_reviews"("id") ON DELETE CASCADE,
        "reviewer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ
      )
    `);

    // 9. tender_review_comments
    await queryRunner.query(`
      CREATE TABLE "tender_review_comments" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "review_id"    UUID NOT NULL REFERENCES "tender_reviews"("id") ON DELETE CASCADE,
        "author_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "comment_text" TEXT NOT NULL,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 10. tender_committees
    await queryRunner.query(`
      CREATE TABLE "tender_committees" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"   UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role"        VARCHAR(50) NOT NULL,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 11. tender_participants
    await queryRunner.query(`
      CREATE TABLE "tender_participants" (
        "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"            UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "vendor_id"            UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status"               VARCHAR(50) NOT NULL,
        "submission_version"   INTEGER,
        "withdrawn_at"         TIMESTAMPTZ,
        "evaluation_completed" BOOLEAN NOT NULL DEFAULT false,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 12. tender_evaluations
    await queryRunner.query(`
      CREATE TABLE "tender_evaluations" (
        "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "participant_id"  UUID NOT NULL REFERENCES "tender_participants"("id") ON DELETE CASCADE,
        "evaluation_type" VARCHAR(50) NOT NULL,
        "criteria_name"   VARCHAR(255) NOT NULL,
        "weight"          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "score"           NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "max_score"       INTEGER NOT NULL DEFAULT 100,
        "passed"          BOOLEAN NOT NULL DEFAULT true,
        "remarks"         TEXT,
        "evaluated_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "evaluated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 13. tender_watchers
    await queryRunner.query(`
      CREATE TABLE "tender_watchers" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"    UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "user_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "notify_email"  BOOLEAN NOT NULL DEFAULT true,
        "notify_in_app" BOOLEAN NOT NULL DEFAULT true,
        "notify_sms"    BOOLEAN NOT NULL DEFAULT false,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 14. tender_invitations
    await queryRunner.query(`
      CREATE TABLE "tender_invitations" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"   UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "email"       VARCHAR(255) NOT NULL,
        "status"      VARCHAR(50) NOT NULL DEFAULT 'invited',
        "resent_at"   TIMESTAMPTZ,
        "opened_at"   TIMESTAMPTZ,
        "accepted_at" TIMESTAMPTZ,
        "expires_at"  TIMESTAMPTZ NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 15. tender_templates
    await queryRunner.query(`
      CREATE TABLE "tender_templates" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "template_scope" VARCHAR(50) NOT NULL,
        "department_id"  UUID,
        "created_by_id"  UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "title"          VARCHAR(255) NOT NULL,
        "description"    TEXT,
        "payload"        JSONB NOT NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 16. tender_questions
    await queryRunner.query(`
      CREATE TABLE "tender_questions" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"      UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "vendor_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "question_text"  TEXT NOT NULL,
        "answer_text"    TEXT,
        "is_public"      BOOLEAN NOT NULL DEFAULT false,
        "answered_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "answered_at"    TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 17. tender_clarifications
    await queryRunner.query(`
      CREATE TABLE "tender_clarifications" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"      UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "title"          VARCHAR(255) NOT NULL,
        "description"    TEXT NOT NULL,
        "created_by_id"  UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 18. tender_amendments
    await queryRunner.query(`
      CREATE TABLE "tender_amendments" (
        "id"               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tender_id"        UUID NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
        "amendment_number" INTEGER NOT NULL,
        "changed_fields"   JSONB NOT NULL,
        "created_by_id"    UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Basic rollback of all created tables in reverse order
    await queryRunner.query('DROP TABLE IF EXISTS "tender_amendments"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_clarifications"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_questions"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_templates"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_invitations"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_watchers"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_evaluations"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_participants"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_committees"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_review_comments"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_review_assignments"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_reviews"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_documents"');
    await queryRunner.query('DROP TABLE IF EXISTS "tender_versions"');
    await queryRunner.query('DROP SEQUENCE IF EXISTS tender_ref_seq;');
  }
}
