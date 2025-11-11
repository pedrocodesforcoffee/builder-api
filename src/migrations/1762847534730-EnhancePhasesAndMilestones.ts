import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhancePhasesAndMilestones1762847534730 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create new enum types
        await queryRunner.query(`
            CREATE TYPE "milestone_status_enum" AS ENUM ('PENDING', 'ACHIEVED', 'MISSED', 'CANCELLED')
        `);

        await queryRunner.query(`
            CREATE TYPE "dependency_type_enum" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH')
        `);

        // Update phase_status enum to add new values
        await queryRunner.query(`
            ALTER TYPE "phase_status_enum" ADD VALUE IF NOT EXISTS 'DELAYED'
        `);
        await queryRunner.query(`
            ALTER TYPE "phase_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'
        `);
        await queryRunner.query(`
            ALTER TYPE "phase_status_enum" ADD VALUE IF NOT EXISTS 'ON_HOLD'
        `);

        // Enhance project_phases table
        await queryRunner.query(`
            ALTER TABLE "project_phases"
            ADD COLUMN "actual_start_date" TIMESTAMP,
            ADD COLUMN "actual_end_date" TIMESTAMP,
            ADD COLUMN "baseline_start_date" TIMESTAMP,
            ADD COLUMN "baseline_end_date" TIMESTAMP,
            ADD COLUMN "percent_complete" INTEGER DEFAULT 0,
            ADD COLUMN "is_on_critical_path" BOOLEAN DEFAULT false,
            ADD COLUMN "is_milestone" BOOLEAN DEFAULT false,
            ADD COLUMN "predecessor_ids" JSONB DEFAULT '[]',
            ADD COLUMN "successor_ids" JSONB DEFAULT '[]',
            ADD COLUMN "dependency_type" dependency_type_enum DEFAULT 'FINISH_TO_START',
            ADD COLUMN "lag_days" INTEGER DEFAULT 0,
            ADD COLUMN "budgeted_cost" DECIMAL(12,2),
            ADD COLUMN "actual_cost" DECIMAL(12,2),
            ADD COLUMN "earned_value" DECIMAL(12,2),
            ADD COLUMN "color" VARCHAR(7),
            ADD COLUMN "icon" VARCHAR(50),
            ADD COLUMN "is_default" BOOLEAN DEFAULT false,
            ADD COLUMN "custom_fields" JSONB DEFAULT '{}',
            ADD COLUMN "created_by" UUID,
            ADD COLUMN "updated_by" UUID
        `);

        // Enhance project_milestones table
        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            RENAME COLUMN "date" TO "planned_date"
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            ADD COLUMN "actual_date" TIMESTAMP,
            ADD COLUMN "baseline_date" TIMESTAMP,
            ADD COLUMN "status" milestone_status_enum DEFAULT 'PENDING',
            ADD COLUMN "completed" BOOLEAN DEFAULT false,
            ADD COLUMN "completed_at" TIMESTAMP,
            ADD COLUMN "completed_by" UUID,
            ADD COLUMN "is_critical" BOOLEAN DEFAULT false,
            ADD COLUMN "is_client_facing" BOOLEAN DEFAULT false,
            ADD COLUMN "requires_approval" BOOLEAN DEFAULT false,
            ADD COLUMN "approved_by" UUID,
            ADD COLUMN "approved_at" TIMESTAMP,
            ADD COLUMN "depends_on_milestone_ids" JSONB DEFAULT '[]',
            ADD COLUMN "completion_criteria" JSONB DEFAULT '[]',
            ADD COLUMN "notify_days_before" INTEGER,
            ADD COLUMN "notify_on_completion" BOOLEAN DEFAULT false,
            ADD COLUMN "notifications_sent" JSONB DEFAULT '[]',
            ADD COLUMN "order" INTEGER DEFAULT 0,
            ADD COLUMN "weight" DECIMAL(5,2) DEFAULT 1.0,
            ADD COLUMN "tags" JSONB DEFAULT '[]',
            ADD COLUMN "custom_fields" JSONB DEFAULT '{}',
            ADD COLUMN "created_by" UUID,
            ADD COLUMN "updated_by" UUID
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_project_phases_project_id" ON "project_phases" ("project_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_phases_status" ON "project_phases" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_phases_dates" ON "project_phases" ("start_date", "end_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_phases_critical_path" ON "project_phases" ("is_on_critical_path")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_phase_id" ON "project_milestones" ("phase_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_project_id" ON "project_milestones" ("project_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_status" ON "project_milestones" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_planned_date" ON "project_milestones" ("planned_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_completed" ON "project_milestones" ("completed")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_milestones_critical" ON "project_milestones" ("is_critical")
        `);

        // Add foreign key constraints for audit fields
        await queryRunner.query(`
            ALTER TABLE "project_phases"
            ADD CONSTRAINT "FK_project_phases_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "project_phases"
            ADD CONSTRAINT "FK_project_phases_updated_by"
            FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            ADD CONSTRAINT "FK_project_milestones_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            ADD CONSTRAINT "FK_project_milestones_updated_by"
            FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            ADD CONSTRAINT "FK_project_milestones_completed_by"
            FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            ADD CONSTRAINT "FK_project_milestones_approved_by"
            FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_project_milestones_approved_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_project_milestones_completed_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_project_milestones_updated_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_project_milestones_created_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "project_phases" DROP CONSTRAINT "FK_project_phases_updated_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "project_phases" DROP CONSTRAINT "FK_project_phases_created_by"
        `);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_critical"`);
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_completed"`);
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_planned_date"`);
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_status"`);
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_project_id"`);
        await queryRunner.query(`DROP INDEX "IDX_project_milestones_phase_id"`);
        await queryRunner.query(`DROP INDEX "IDX_project_phases_critical_path"`);
        await queryRunner.query(`DROP INDEX "IDX_project_phases_dates"`);
        await queryRunner.query(`DROP INDEX "IDX_project_phases_status"`);
        await queryRunner.query(`DROP INDEX "IDX_project_phases_project_id"`);

        // Revert project_milestones table changes
        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            DROP COLUMN "updated_by",
            DROP COLUMN "created_by",
            DROP COLUMN "custom_fields",
            DROP COLUMN "tags",
            DROP COLUMN "weight",
            DROP COLUMN "order",
            DROP COLUMN "notifications_sent",
            DROP COLUMN "notify_on_completion",
            DROP COLUMN "notify_days_before",
            DROP COLUMN "completion_criteria",
            DROP COLUMN "depends_on_milestone_ids",
            DROP COLUMN "approved_at",
            DROP COLUMN "approved_by",
            DROP COLUMN "requires_approval",
            DROP COLUMN "is_client_facing",
            DROP COLUMN "is_critical",
            DROP COLUMN "completed_by",
            DROP COLUMN "completed_at",
            DROP COLUMN "completed",
            DROP COLUMN "status",
            DROP COLUMN "baseline_date",
            DROP COLUMN "actual_date"
        `);

        await queryRunner.query(`
            ALTER TABLE "project_milestones"
            RENAME COLUMN "planned_date" TO "date"
        `);

        // Revert project_phases table changes
        await queryRunner.query(`
            ALTER TABLE "project_phases"
            DROP COLUMN "updated_by",
            DROP COLUMN "created_by",
            DROP COLUMN "custom_fields",
            DROP COLUMN "is_default",
            DROP COLUMN "icon",
            DROP COLUMN "color",
            DROP COLUMN "earned_value",
            DROP COLUMN "actual_cost",
            DROP COLUMN "budgeted_cost",
            DROP COLUMN "lag_days",
            DROP COLUMN "dependency_type",
            DROP COLUMN "successor_ids",
            DROP COLUMN "predecessor_ids",
            DROP COLUMN "is_milestone",
            DROP COLUMN "is_on_critical_path",
            DROP COLUMN "percent_complete",
            DROP COLUMN "baseline_end_date",
            DROP COLUMN "baseline_start_date",
            DROP COLUMN "actual_end_date",
            DROP COLUMN "actual_start_date"
        `);

        // Drop enum types
        await queryRunner.query(`DROP TYPE "dependency_type_enum"`);
        await queryRunner.query(`DROP TYPE "milestone_status_enum"`);
    }

}
