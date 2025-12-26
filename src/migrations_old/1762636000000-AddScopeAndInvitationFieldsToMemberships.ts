import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Add Scope and Invitation Fields to Membership Tables
 *
 * Adds the following fields to support enhanced role-based access control:
 *
 * Project Members:
 * - scope: JSONB field for granular access control (e.g., specific trades, floors, areas)
 * - invited_at, accepted_at, joined_at: Invitation workflow tracking
 * - last_accessed_at: Activity tracking for inactive member detection
 *
 * Organization Members:
 * - invited_at, accepted_at, joined_at: Invitation workflow tracking
 *
 * Also creates indices on the new timestamp fields for query optimization.
 */
export class AddScopeAndInvitationFieldsToMemberships1762636000000 implements MigrationInterface {
    name = 'AddScopeAndInvitationFieldsToMemberships1762636000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add scope field to project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "scope" jsonb`
        );

        // Add invitation workflow fields to project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "invited_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "accepted_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "joined_at" TIMESTAMP`
        );

        // Add activity tracking to project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "last_accessed_at" TIMESTAMP`
        );

        // Create indices for project_members timestamp fields
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_invited_at" ON "project_members" ("invited_at")`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_joined_at" ON "project_members" ("joined_at")`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_last_accessed" ON "project_members" ("last_accessed_at")`
        );

        // Add invitation workflow fields to organization_members
        await queryRunner.query(
            `ALTER TABLE "organization_members" ADD "invited_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "organization_members" ADD "accepted_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "organization_members" ADD "joined_at" TIMESTAMP`
        );

        // Create indices for organization_members timestamp fields
        await queryRunner.query(
            `CREATE INDEX "IDX_org_members_invited_at" ON "organization_members" ("invited_at")`
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_org_members_joined_at" ON "organization_members" ("joined_at")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indices for organization_members
        await queryRunner.query(
            `DROP INDEX "public"."IDX_org_members_joined_at"`
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_org_members_invited_at"`
        );

        // Remove invitation workflow fields from organization_members
        await queryRunner.query(
            `ALTER TABLE "organization_members" DROP COLUMN "joined_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "organization_members" DROP COLUMN "accepted_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "organization_members" DROP COLUMN "invited_at"`
        );

        // Drop indices for project_members
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_last_accessed"`
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_joined_at"`
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_invited_at"`
        );

        // Remove activity tracking from project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "last_accessed_at"`
        );

        // Remove invitation workflow fields from project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "joined_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "accepted_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "invited_at"`
        );

        // Remove scope field from project_members
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "scope"`
        );
    }
}
