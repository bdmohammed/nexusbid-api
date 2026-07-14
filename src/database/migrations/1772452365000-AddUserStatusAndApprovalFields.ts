import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatusAndApprovalFields1772452365000 implements MigrationInterface {
  name = "AddUserStatusAndApprovalFields1772452365000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" varchar(50) NOT NULL DEFAULT 'pending_email_verification'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "approved_by_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "approved_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "rejection_reason" text`);

    // Add Foreign Key constraint
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_approved_by_id" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    // Update existing users status based on their email_verified field
    await queryRunner.query(
      `UPDATE "users" SET "status" = 'active' WHERE "email_verified" = true`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "status" = 'pending_email_verification' WHERE "email_verified" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_approved_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "rejection_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "approved_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "approved_by_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
  }
}
