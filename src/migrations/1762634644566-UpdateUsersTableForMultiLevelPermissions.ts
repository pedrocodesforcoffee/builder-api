import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUsersTableForMultiLevelPermissions1762634644566 implements MigrationInterface {
    name = 'UpdateUsersTableForMultiLevelPermissions1762634644566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "settings" jsonb DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_organizations_is_active" ON "organizations" ("is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_organizations_slug" ON "organizations" ("slug") `);
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(50) NOT NULL, "description" text, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'planning', "location" text, "start_date" date, "end_date" date, "actual_completion_date" date, "settings" jsonb DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_projects_start_date" ON "projects" ("start_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_projects_status" ON "projects" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_projects_code" ON "projects" ("organization_id", "code") `);
        await queryRunner.query(`CREATE INDEX "IDX_projects_organization" ON "projects" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."project_members_role_enum" AS ENUM('project_admin', 'project_manager', 'project_engineer', 'superintendent', 'foreman', 'architect_engineer', 'subcontractor', 'owner_rep', 'inspector', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "project_members" ("user_id" uuid NOT NULL, "project_id" uuid NOT NULL, "role" "public"."project_members_role_enum" NOT NULL, "added_by_user_id" uuid, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3f491d3a3f986106d281d8eb4b" PRIMARY KEY ("user_id", "project_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_proj_members_expires_at" ON "project_members" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_proj_members_role" ON "project_members" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_proj_members_user" ON "project_members" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_proj_members_project" ON "project_members" ("project_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_proj_members_user_proj" ON "project_members" ("user_id", "project_id") `);
        await queryRunner.query(`CREATE TYPE "public"."organization_members_role_enum" AS ENUM('owner', 'org_admin', 'org_member', 'guest')`);
        await queryRunner.query(`CREATE TABLE "organization_members" ("user_id" uuid NOT NULL, "organization_id" uuid NOT NULL, "role" "public"."organization_members_role_enum" NOT NULL, "added_by_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4812f00736e35131a65d6032da" PRIMARY KEY ("user_id", "organization_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_members_role" ON "organization_members" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_org_members_user" ON "organization_members" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_org_members_organization" ON "organization_members" ("organization_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_org_members_user_org" ON "organization_members" ("user_id", "organization_id") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_system_role_enum" AS ENUM('user', 'system_admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "system_role" "public"."users_system_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."password" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_users_system_role" ON "users" ("system_role") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_is_active" ON "users" ("is_active") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_585c8ce06628c70b70100bfb842" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_6913410c6ad72172cbdef432d2b" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_members" ADD CONSTRAINT "FK_7516ed53acdb499ff3fbb741a9a" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_7516ed53acdb499ff3fbb741a9a"`);
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9"`);
        await queryRunner.query(`ALTER TABLE "organization_members" DROP CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_6913410c6ad72172cbdef432d2b"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_585c8ce06628c70b70100bfb842"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_is_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_system_role"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."password" IS 'Hashed password - NEVER store plain text'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "system_role"`);
        await queryRunner.query(`DROP TYPE "public"."users_system_role_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'moderator')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_members_user_org"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_members_organization"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_members_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_members_role"`);
        await queryRunner.query(`DROP TABLE "organization_members"`);
        await queryRunner.query(`DROP TYPE "public"."organization_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_proj_members_user_proj"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_proj_members_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_proj_members_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_proj_members_role"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_proj_members_expires_at"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "public"."project_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_organization"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_code"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_start_date"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_organizations_slug"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_organizations_is_active"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
