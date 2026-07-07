import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailTokenEnumValues1772452366000 implements MigrationInterface {
  name = 'AddEmailTokenEnumValues1772452366000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL before version 12
    // but works fine in standard TypeORM query executions in newer PostgreSQL versions.
    await queryRunner.query(
      `ALTER TYPE "public"."email_tokens_type_enum" ADD VALUE IF NOT EXISTS 'email_change'`
    );
    await queryRunner.query(
      `ALTER TYPE "public"."email_tokens_type_enum" ADD VALUE IF NOT EXISTS 'system_owner_approval'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an ENUM type via ALTER TYPE.
    // Down migration is intentionally left empty.
  }
}
