import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceProjectFolders1762876464119 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create folder_type_enum with all 21 values
        await queryRunner.query(`
            CREATE TYPE folder_type_enum AS ENUM (
                'GENERAL',
                'DRAWINGS',
                'SPECIFICATIONS',
                'RFIS',
                'SUBMITTALS',
                'PHOTOS',
                'REPORTS',
                'CONTRACTS',
                'SCHEDULES',
                'PERMITS',
                'CORRESPONDENCE',
                'MEETING_NOTES',
                'PUNCH_LIST',
                'CLOSEOUT',
                'FINANCIAL',
                'SAFETY',
                'QUALITY',
                'TESTING',
                'AS_BUILTS',
                'WARRANTIES',
                'CUSTOM'
            )
        `);

        // Create access_level_enum
        await queryRunner.query(`
            CREATE TYPE access_level_enum AS ENUM (
                'NO_ACCESS',
                'READ_ONLY',
                'READ_WRITE',
                'ADMIN',
                'OWNER'
            )
        `);

        // Update path column length from 500 to 1000
        await queryRunner.query(`
            ALTER TABLE project_folders
            ALTER COLUMN path TYPE VARCHAR(1000)
        `);

        // Add new columns to project_folders
        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD COLUMN level INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN is_system_folder BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN folder_type folder_type_enum NOT NULL DEFAULT 'GENERAL',
            ADD COLUMN inherit_permissions BOOLEAN NOT NULL DEFAULT true,
            ADD COLUMN permissions JSONB NOT NULL DEFAULT '[]',
            ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN color VARCHAR(7),
            ADD COLUMN icon VARCHAR(50),
            ADD COLUMN tags JSONB NOT NULL DEFAULT '[]',
            ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}',
            ADD COLUMN file_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN total_file_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN total_size BIGINT NOT NULL DEFAULT 0,
            ADD COLUMN last_activity_at TIMESTAMP,
            ADD COLUMN created_by UUID,
            ADD COLUMN updated_by UUID,
            ADD COLUMN deleted_at TIMESTAMP
        `);

        // Add foreign key constraints for created_by and updated_by
        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT FK_project_folders_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT FK_project_folders_updated_by
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        `);

        // Update parent_id foreign key to ON DELETE SET NULL (drop and recreate)
        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS FK_project_folders_parent_id
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT FK_project_folders_parent_id
            FOREIGN KEY (parent_id) REFERENCES project_folders(id) ON DELETE SET NULL
        `);

        // Add check constraints
        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT CHK_project_folders_level_non_negative
            CHECK (level >= 0)
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT CHK_project_folders_file_count_non_negative
            CHECK (file_count >= 0)
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT CHK_project_folders_total_file_count_valid
            CHECK (total_file_count >= file_count)
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT CHK_project_folders_total_size_non_negative
            CHECK (total_size >= 0)
        `);

        // Add unique constraint on (project_id, parent_id, name) with COALESCE for nulls
        await queryRunner.query(`
            CREATE UNIQUE INDEX IDX_project_folders_unique_name
            ON project_folders (project_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
            WHERE deleted_at IS NULL
        `);

        // Create indexes on project_folders
        await queryRunner.query(`
            CREATE INDEX IDX_project_folders_path
            ON project_folders (path)
        `);

        await queryRunner.query(`
            CREATE INDEX IDX_project_folders_folder_type
            ON project_folders (folder_type)
        `);

        await queryRunner.query(`
            CREATE INDEX IDX_project_folders_project_parent
            ON project_folders (project_id, parent_id)
        `);

        await queryRunner.query(`
            CREATE INDEX IDX_project_folders_permissions
            ON project_folders USING GIN (permissions)
        `);

        await queryRunner.query(`
            CREATE INDEX IDX_project_folders_tags
            ON project_folders USING GIN (tags)
        `);

        // Create folder_templates table
        await queryRunner.query(`
            CREATE TABLE folder_templates (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                project_type VARCHAR(50),
                folder_structure JSONB NOT NULL,
                organization_id UUID,
                is_system BOOLEAN NOT NULL DEFAULT false,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by UUID,
                updated_by UUID,
                CONSTRAINT FK_folder_templates_organization
                    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                CONSTRAINT FK_folder_templates_created_by
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT FK_folder_templates_updated_by
                    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create indexes on folder_templates
        await queryRunner.query(`
            CREATE INDEX IDX_folder_templates_project_type
            ON folder_templates (project_type)
        `);

        await queryRunner.query(`
            CREATE INDEX IDX_folder_templates_organization
            ON folder_templates (organization_id)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes on folder_templates
        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_folder_templates_organization
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_folder_templates_project_type
        `);

        // Drop folder_templates table
        await queryRunner.query(`
            DROP TABLE IF EXISTS folder_templates
        `);

        // Drop indexes on project_folders
        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_tags
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_permissions
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_project_parent
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_folder_type
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_path
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_project_folders_unique_name
        `);

        // Drop check constraints
        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS CHK_project_folders_total_size_non_negative
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS CHK_project_folders_total_file_count_valid
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS CHK_project_folders_file_count_non_negative
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS CHK_project_folders_level_non_negative
        `);

        // Restore parent_id foreign key to ON DELETE CASCADE
        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS FK_project_folders_parent_id
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            ADD CONSTRAINT FK_project_folders_parent_id
            FOREIGN KEY (parent_id) REFERENCES project_folders(id) ON DELETE CASCADE
        `);

        // Drop foreign key constraints
        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS FK_project_folders_updated_by
        `);

        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP CONSTRAINT IF EXISTS FK_project_folders_created_by
        `);

        // Drop new columns from project_folders
        await queryRunner.query(`
            ALTER TABLE project_folders
            DROP COLUMN IF EXISTS deleted_at,
            DROP COLUMN IF EXISTS updated_by,
            DROP COLUMN IF EXISTS created_by,
            DROP COLUMN IF EXISTS last_activity_at,
            DROP COLUMN IF EXISTS total_size,
            DROP COLUMN IF EXISTS total_file_count,
            DROP COLUMN IF EXISTS file_count,
            DROP COLUMN IF EXISTS custom_fields,
            DROP COLUMN IF EXISTS tags,
            DROP COLUMN IF EXISTS icon,
            DROP COLUMN IF EXISTS color,
            DROP COLUMN IF EXISTS is_locked,
            DROP COLUMN IF EXISTS is_public,
            DROP COLUMN IF EXISTS permissions,
            DROP COLUMN IF EXISTS inherit_permissions,
            DROP COLUMN IF EXISTS folder_type,
            DROP COLUMN IF EXISTS is_system_folder,
            DROP COLUMN IF EXISTS level
        `);

        // Revert path column length from 1000 to 500
        await queryRunner.query(`
            ALTER TABLE project_folders
            ALTER COLUMN path TYPE VARCHAR(500)
        `);

        // Drop enum types
        await queryRunner.query(`
            DROP TYPE IF EXISTS access_level_enum
        `);

        await queryRunner.query(`
            DROP TYPE IF EXISTS folder_type_enum
        `);
    }

}
