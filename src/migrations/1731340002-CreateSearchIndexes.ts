import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSearchIndexes1731340002 implements MigrationInterface {
  name = 'CreateSearchIndexes1731340002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm extension if available (for fuzzy matching)
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `).catch(() => {
      // Extension might not be available, continue without it
    });

    // Create additional indexes for search performance

    // Date range indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_start_date_end_date"
      ON "projects" (start_date, end_date);
    `);

    // Budget index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_original_contract"
      ON "projects" (original_contract);
    `);

    // Composite indexes for common filter combinations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_org_status"
      ON "projects" (organization_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_type_status"
      ON "projects" (type, status);
    `);

    // GIN indexes for JSONB fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_custom_fields"
      ON "projects" USING GIN (custom_fields);
    `);

    // Tags index (if not already array type)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_tags"
      ON "projects" USING GIN (tags);
    `).catch(() => {
      // Might fail if tags is not array type
    });

    // Location indexes for spatial queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_city_state"
      ON "projects" (city, state);
    `);

    // Trigram indexes for fuzzy matching (if pg_trgm is available)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_name_trgm"
      ON "projects" USING GIST (name gist_trgm_ops);
    `).catch(() => {
      // Will fail if pg_trgm is not available
    });

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_number_trgm"
      ON "projects" USING GIST (number gist_trgm_ops);
    `).catch(() => {
      // Will fail if pg_trgm is not available
    });

    // Percent complete index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_percent_complete"
      ON "projects" (percent_complete);
    `);

    // Delivery method index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_delivery_method"
      ON "projects" (delivery_method)
      WHERE delivery_method IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_delivery_method";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_percent_complete";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_number_trgm";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_name_trgm";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_city_state";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_tags";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_custom_fields";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_type_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_org_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_original_contract";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_start_date_end_date";`);
  }
}