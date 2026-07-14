import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Enables PostgreSQL full-text search and trigram extensions.
 * Creates GIN indexes for fast FTS and partial-word matching on tenders.
 *
 * pg_trgm is bundled with PostgreSQL — no extra installation needed.
 * These indexes are used by the buildTenderSearchQuery() function.
 */
export class EnableFtsAndTrigram1700000000007 implements MigrationInterface {
  name = "EnableFtsAndTrigram1700000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable trigram extension (fuzzy/partial word matching)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Full-text search GIN index on title + description
    await queryRunner.query(`
      CREATE INDEX "idx_tenders_fts" ON "tenders"
      USING GIN(to_tsvector('english', "title" || ' ' || COALESCE("description", '')))
    `);

    // Trigram GIN index on title (for ILIKE partial word search)
    await queryRunner.query(`
      CREATE INDEX "idx_tenders_title_trgm" ON "tenders"
      USING GIN("title" gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenders_title_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenders_fts"`);
  }
}
