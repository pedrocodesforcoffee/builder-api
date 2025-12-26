import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Add Expiration Fields to Project Members
 *
 * Adds time-based expiration tracking and renewal workflow to project memberships.
 *
 * New Fields:
 * - expiration_reason: Reason for temporary access (e.g., "90-day contractor engagement")
 * - expiration_warning_notified_at: Timestamp when 7-day warning was sent
 * - expiration_final_notified_at: Timestamp when 1-day warning was sent
 * - expired_notified_at: Timestamp when expiration notification was sent
 * - renewal_requested: Flag indicating user has requested renewal
 * - renewal_requested_at: Timestamp when renewal was requested
 * - renewal_requested_by: User ID who requested renewal
 * - renewal_reason: Justification for renewal request
 * - renewal_processed_by: Admin user ID who processed the renewal
 * - renewal_processed_at: Timestamp when renewal was processed
 * - renewal_status: Status of renewal request (pending, approved, denied)
 *
 * Indexes:
 * - Partial index on expires_at for finding active expiring memberships
 * - Partial index on renewal_requested for finding pending renewals
 */
export class AddExpirationFieldsToProjectMembers1762637000000 implements MigrationInterface {
    name = 'AddExpirationFieldsToProjectMembers1762637000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add expiration reason field
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "expiration_reason" TEXT`
        );

        // Add notification timestamp fields
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "expiration_warning_notified_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "expiration_final_notified_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "expired_notified_at" TIMESTAMP`
        );

        // Add renewal request fields
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_requested" BOOLEAN NOT NULL DEFAULT FALSE`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_requested_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_requested_by" UUID`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_reason" TEXT`
        );

        // Add renewal processing fields
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_processed_by" UUID`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_processed_at" TIMESTAMP`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD "renewal_status" VARCHAR(20)`
        );

        // Add check constraint for renewal_status
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD CONSTRAINT "CHK_renewal_status" CHECK (renewal_status IN ('pending', 'approved', 'denied'))`
        );

        // Add foreign key constraints
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD CONSTRAINT "FK_renewal_requested_by_user" FOREIGN KEY ("renewal_requested_by") REFERENCES "users"("id") ON DELETE SET NULL`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" ADD CONSTRAINT "FK_renewal_processed_by_user" FOREIGN KEY ("renewal_processed_by") REFERENCES "users"("id") ON DELETE SET NULL`
        );

        // Create partial index for finding active expiring memberships
        // This index is used to efficiently query memberships that are expiring
        // but have not yet had an expiration notification sent
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_expires_at_active" ON "project_members" ("expires_at") WHERE "expires_at" IS NOT NULL AND "expired_notified_at" IS NULL`
        );

        // Create partial index for finding pending renewal requests
        // This index is used to efficiently query memberships that have
        // requested renewal and are awaiting admin approval
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_renewal_pending" ON "project_members" ("renewal_requested") WHERE "renewal_requested" = TRUE AND "renewal_status" = 'pending'`
        );

        // Create standard index on expires_at for general expiration queries
        await queryRunner.query(
            `CREATE INDEX "IDX_proj_members_expires_at" ON "project_members" ("expires_at")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_expires_at"`
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_renewal_pending"`
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_proj_members_expires_at_active"`
        );

        // Drop foreign key constraints
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP CONSTRAINT "FK_renewal_processed_by_user"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP CONSTRAINT "FK_renewal_requested_by_user"`
        );

        // Drop check constraint
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP CONSTRAINT "CHK_renewal_status"`
        );

        // Remove renewal processing fields
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_status"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_processed_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_processed_by"`
        );

        // Remove renewal request fields
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_reason"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_requested_by"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_requested_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "renewal_requested"`
        );

        // Remove notification timestamp fields
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "expired_notified_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "expiration_final_notified_at"`
        );
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "expiration_warning_notified_at"`
        );

        // Remove expiration reason field
        await queryRunner.query(
            `ALTER TABLE "project_members" DROP COLUMN "expiration_reason"`
        );
    }
}
