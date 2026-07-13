import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDbVersionToTenders1772520000000 implements MigrationInterface {
  name = 'AddDbVersionToTenders1772520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenders" ADD COLUMN "db_version" INTEGER NOT NULL DEFAULT 1;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenders" DROP COLUMN "db_version";`);
  }
}
