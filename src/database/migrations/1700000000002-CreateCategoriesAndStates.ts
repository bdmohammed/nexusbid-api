import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoriesAndStates1700000000002 implements MigrationInterface {
  name = "CreateCategoriesAndStates1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "code"  VARCHAR(10)  NOT NULL UNIQUE,
        "name"  VARCHAR(200) NOT NULL,
        "slug"  VARCHAR(200) NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "states" (
        "id"    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "code"  VARCHAR(20)  NOT NULL UNIQUE,
        "name"  VARCHAR(100) NOT NULL,
        "slug"  VARCHAR(100) NOT NULL UNIQUE,
        "type"  VARCHAR(20)  NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "states"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
