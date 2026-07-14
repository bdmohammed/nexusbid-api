import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeedHistory1772540000000 implements MigrationInterface {
  name = "CreateSeedHistory1772540000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "seed_histories" (
        "id" VARCHAR(150) PRIMARY KEY,
        "executed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "checksum" VARCHAR(64) NOT NULL,
        "status" VARCHAR(50) NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seed_histories";`);
  }
}
