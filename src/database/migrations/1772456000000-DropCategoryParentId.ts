import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropCategoryParentId1772456000000 implements MigrationInterface {
  name = "DropCategoryParentId1772456000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ADD COLUMN "parent_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL`,
    );
  }
}
