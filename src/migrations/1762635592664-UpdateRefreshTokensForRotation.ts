import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRefreshTokensForRotation1762635592664 implements MigrationInterface {
    name = 'UpdateRefreshTokensForRotation1762635592664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Delete all existing refresh tokens since they're incompatible with the new rotation system
        // Users will need to log in again to get new tokens
        await queryRunner.query(`DELETE FROM "refresh_tokens"`);

        // Add new columns for token rotation
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "family_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "previous_token_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "generation" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "device_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "used_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "revoke_reason" character varying(50)`);

        // Create indexes for new columns
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_previous_token" ON "refresh_tokens" ("previous_token_hash") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_previous_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_family_id"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "revoke_reason"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "used_at"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "device_id"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "generation"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "previous_token_hash"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "family_id"`);
    }

}
