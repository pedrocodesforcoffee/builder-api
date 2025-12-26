import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectSearchVector1731340001 implements MigrationInterface {
  name = 'AddProjectSearchVector1731340001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add search_vector column to projects table
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "search_vector" tsvector
    `);

    // Create function to update search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_project_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.number, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.address, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(NEW.state, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for INSERT/UPDATE
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_project_search_vector_trigger ON "projects";

      CREATE TRIGGER update_project_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "projects"
      FOR EACH ROW
      EXECUTE FUNCTION update_project_search_vector();
    `);

    // Create GIN index on search_vector
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_search_vector"
      ON "projects" USING GIN (search_vector);
    `);

    // Update existing projects with search_vector values
    await queryRunner.query(`
      UPDATE "projects"
      SET search_vector =
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(number, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(address, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(state, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_project_search_vector_trigger ON "projects";
    `);

    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_project_search_vector();
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_search_vector";
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "search_vector";
    `);
  }
}