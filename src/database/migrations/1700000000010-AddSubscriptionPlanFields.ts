import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionPlanFields1700000000010 implements MigrationInterface {
  name = "AddSubscriptionPlanFields1700000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "plans" 
      ADD COLUMN "plan_type" VARCHAR(50) NOT NULL DEFAULT 'all-access',
      ADD COLUMN "target_state_id" UUID REFERENCES "states"("id") ON DELETE SET NULL,
      ADD COLUMN "target_country" VARCHAR(100),
      ADD COLUMN "target_category_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
      ADD COLUMN "bundle_size" INTEGER,
      ADD COLUMN "trial_days" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN "discount_percentage" INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN "target_state_id" UUID REFERENCES "states"("id") ON DELETE SET NULL,
      ADD COLUMN "target_country" VARCHAR(100),
      ADD COLUMN "target_category_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
      ADD COLUMN "selected_category_ids" JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN "selected_category_ids",
      DROP COLUMN "target_category_id",
      DROP COLUMN "target_country",
      DROP COLUMN "target_state_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "plans"
      DROP COLUMN "discount_percentage",
      DROP COLUMN "trial_days",
      DROP COLUMN "bundle_size",
      DROP COLUMN "target_category_id",
      DROP COLUMN "target_country",
      DROP COLUMN "target_state_id",
      DROP COLUMN "plan_type"
    `);
  }
}
