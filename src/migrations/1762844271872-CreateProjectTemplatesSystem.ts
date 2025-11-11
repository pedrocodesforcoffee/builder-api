import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectTemplatesSystem1762844271872 implements MigrationInterface {
    name = 'CreateProjectTemplatesSystem1762844271872'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // NOTE: This migration is a no-op because the schema was already created by TypeORM's synchronize feature.
        // The tables, indexes, and foreign keys already exist in the database.
        // This migration exists only to record that the project templates system schema is in place.

        // Verify that the key tables exist
        const hasProjectTemplates = await queryRunner.hasTable('project_templates');
        const hasProjectPhases = await queryRunner.hasTable('project_phases');
        const hasProjectMilestones = await queryRunner.hasTable('project_milestones');
        const hasProjectFolders = await queryRunner.hasTable('project_folders');

        if (!hasProjectTemplates || !hasProjectPhases || !hasProjectMilestones || !hasProjectFolders) {
            throw new Error('Project Templates System tables do not exist. Please run with DB_SYNCHRONIZE=true first.');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "project_folders" DROP CONSTRAINT "FK_project_folders_parent"`);
        await queryRunner.query(`ALTER TABLE "project_folders" DROP CONSTRAINT "FK_project_folders_project"`);
        await queryRunner.query(`ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_project_milestones_phase"`);
        await queryRunner.query(`ALTER TABLE "project_phases" DROP CONSTRAINT "FK_project_phases_project"`);
        await queryRunner.query(`ALTER TABLE "project_templates" DROP CONSTRAINT "FK_project_templates_updated_by"`);
        await queryRunner.query(`ALTER TABLE "project_templates" DROP CONSTRAINT "FK_project_templates_created_by"`);
        await queryRunner.query(`ALTER TABLE "project_templates" DROP CONSTRAINT "FK_project_templates_organization"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_project_folders_parent"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_folders_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_milestones_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_milestones_phase"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_phases_dates"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_phases_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_templates_usage_count"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_templates_is_system"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_templates_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_templates_organization"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "project_folders"`);
        await queryRunner.query(`DROP TABLE "project_milestones"`);
        await queryRunner.query(`DROP TABLE "project_phases"`);
        await queryRunner.query(`DROP TABLE "project_templates"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "public"."project_phases_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."project_templates_category_enum"`);
    }
}
