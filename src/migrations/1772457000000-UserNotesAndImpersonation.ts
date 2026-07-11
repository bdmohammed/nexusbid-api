import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNotesAndImpersonation1772457000000 implements MigrationInterface {
  name = 'UserNotesAndImpersonation1772457000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "admin_id" uuid NULL,
        "note" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_notes_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_notes_admin" FOREIGN KEY ("admin_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_notes_user_id" ON "user_notes" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_notes_admin_id" ON "user_notes" ("admin_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_user_notes_admin_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_user_notes_user_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "user_notes"');
  }
}
