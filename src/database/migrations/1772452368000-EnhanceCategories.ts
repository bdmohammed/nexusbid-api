import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceCategories1772452368000 implements MigrationInterface {
  name = "EnhanceCategories1772452368000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN "description" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN "parent_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_parent"`,
    );
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "parent_id"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "is_active"`);
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "description"`,
    );
  }
}
