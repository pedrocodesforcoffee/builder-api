import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceProjectEntity1762842135689 implements MigrationInterface {
    name = 'EnhanceProjectEntity1762842135689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add number column as nullable first
        await queryRunner.query(`ALTER TABLE "projects" ADD "number" character varying(50)`);
        // Copy data from code to number
        await queryRunner.query(`UPDATE "projects" SET "number" = "code"`);
        // Now make number NOT NULL
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "number" SET NOT NULL`);

        // Drop old columns and index
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_code"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "actual_completion_date"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "address" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "city" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "state" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "zip" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "country" character varying(100) DEFAULT 'USA'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "longitude" numeric(10,7)`);
        await queryRunner.query(`CREATE TYPE "public"."projects_type_enum" AS ENUM('commercial', 'residential', 'infrastructure', 'industrial', 'healthcare')`);
        // Add type as nullable first, set default, then make NOT NULL
        await queryRunner.query(`ALTER TABLE "projects" ADD "type" "public"."projects_type_enum"`);
        await queryRunner.query(`UPDATE "projects" SET "type" = 'commercial' WHERE "type" IS NULL`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."projects_delivery_method_enum" AS ENUM('design_bid_build', 'design_build', 'cm_at_risk', 'ipd')`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "delivery_method" "public"."projects_delivery_method_enum"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "contract_type" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "square_footage" integer`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "substantial_completion" date`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "final_completion" date`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "original_contract" numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "current_contract" numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "percent_complete" numeric(5,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "timezone" character varying(50) DEFAULT 'America/New_York'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "working_days" jsonb DEFAULT '[1,2,3,4,5]'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "holidays" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "custom_fields" jsonb DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "tags" text`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "updated_by" uuid`);
        // Handle status enum migration with data mapping
        // Old enum: 'planning', 'active', 'on_hold', 'completed', 'cancelled'
        // New enum: 'bidding', 'awarded', 'preconstruction', 'construction', 'closeout', 'warranty', 'complete'

        // Add temporary text column
        await queryRunner.query(`ALTER TABLE "projects" ADD "status_temp" text`);
        // Map old values to new ones
        await queryRunner.query(`UPDATE "projects" SET "status_temp" = CASE
            WHEN "status"::text = 'planning' THEN 'bidding'
            WHEN "status"::text = 'active' THEN 'construction'
            WHEN "status"::text = 'on_hold' THEN 'bidding'
            WHEN "status"::text = 'completed' THEN 'complete'
            WHEN "status"::text = 'cancelled' THEN 'bidding'
            ELSE 'bidding'
        END`);

        // Drop old column
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);

        // Create new enum and column
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum" AS ENUM('bidding', 'awarded', 'preconstruction', 'construction', 'closeout', 'warranty', 'complete')`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "status" "public"."projects_status_enum" NOT NULL DEFAULT 'bidding'`);

        // Copy mapped values
        await queryRunner.query(`UPDATE "projects" SET "status" = "status_temp"::"public"."projects_status_enum"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "status_temp"`);
        await queryRunner.query(`CREATE INDEX "IDX_projects_location" ON "projects" ("latitude", "longitude") `);
        await queryRunner.query(`CREATE INDEX "IDX_projects_type" ON "projects" ("type") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_projects_number" ON "projects" ("organization_id", "number") `);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_8a7ccdb94bcc8635f933c8f8080" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_458ce18ebdb792c80257bc96678" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_458ce18ebdb792c80257bc96678"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_8a7ccdb94bcc8635f933c8f8080"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_number"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_location"`);
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum_old" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."projects_status_enum_old" USING "status"::"text"::"public"."projects_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'planning'`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."projects_status_enum_old" RENAME TO "projects_status_enum"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "custom_fields"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "holidays"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "working_days"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "timezone"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "percent_complete"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "current_contract"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "original_contract"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "final_completion"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "substantial_completion"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "square_footage"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "contract_type"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "delivery_method"`);
        await queryRunner.query(`DROP TYPE "public"."projects_delivery_method_enum"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."projects_type_enum"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "latitude"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "zip"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "number"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "settings" jsonb DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "actual_completion_date" date`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "location" text`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "code" character varying(50) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_projects_code" ON "projects" ("organization_id", "code") `);
    }

}
