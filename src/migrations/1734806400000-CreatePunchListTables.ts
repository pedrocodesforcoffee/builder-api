import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePunchListTables1734806400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "location_type" AS ENUM (
        'BUILDING',
        'FLOOR',
        'UNIT',
        'ROOM',
        'AREA',
        'ZONE',
        'OTHER'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "punch_list_type" AS ENUM (
        'PRE_FINAL',
        'FINAL',
        'WARRANTY',
        'CLOSEOUT',
        'PHASE_COMPLETION',
        'CUSTOM'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "punch_item_status" AS ENUM (
        'OPEN',
        'IN_PROGRESS',
        'READY_FOR_REVIEW',
        'APPROVED',
        'REJECTED',
        'DISPUTED',
        'DEFERRED',
        'CLOSED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "punch_item_priority" AS ENUM (
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW',
        'COSMETIC'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "punch_item_category" AS ENUM (
        'STRUCTURAL',
        'ARCHITECTURAL',
        'MEP',
        'ELECTRICAL',
        'PLUMBING',
        'HVAC',
        'FINISHES',
        'DOORS_WINDOWS',
        'FLOORING',
        'CEILING',
        'LANDSCAPING',
        'OTHER'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "ball_in_court" AS ENUM (
        'SUBCONTRACTOR',
        'GENERAL_CONTRACTOR',
        'OWNER',
        'ARCHITECT'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "photo_type" AS ENUM (
        'BEFORE',
        'AFTER',
        'PROGRESS',
        'REFERENCE'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "history_action" AS ENUM (
        'CREATED',
        'UPDATED',
        'STATUS_CHANGED',
        'ASSIGNED',
        'COMMENTED',
        'PHOTO_ADDED',
        'PHOTO_REMOVED',
        'PRIORITY_CHANGED',
        'BALL_IN_COURT_CHANGED',
        'DUE_DATE_CHANGED',
        'COMPLETED',
        'REOPENED'
      );
    `);

    // Create project_locations table
    await queryRunner.query(`
      CREATE TABLE "project_locations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" UUID NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(100) NOT NULL,
        "type" "location_type" NOT NULL DEFAULT 'ROOM',
        "description" TEXT,
        "sortOrder" INT NOT NULL DEFAULT 0,
        "createdById" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_project_locations_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_locations_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Create closure table for tree structure (TypeORM tree pattern)
    await queryRunner.query(`
      CREATE TABLE "project_locations_closure" (
        "id_ancestor" UUID NOT NULL,
        "id_descendant" UUID NOT NULL,
        PRIMARY KEY ("id_ancestor", "id_descendant"),
        CONSTRAINT "FK_closure_ancestor" FOREIGN KEY ("id_ancestor") REFERENCES "project_locations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_closure_descendant" FOREIGN KEY ("id_descendant") REFERENCES "project_locations"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for project_locations
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_project_locations_project_code" ON "project_locations" ("projectId", "code");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_locations_project_type" ON "project_locations" ("projectId", "type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_closure_ancestor" ON "project_locations_closure" ("id_ancestor");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_closure_descendant" ON "project_locations_closure" ("id_descendant");
    `);

    // Create punch_lists table
    await queryRunner.query(`
      CREATE TABLE "punch_lists" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" UUID NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "type" "punch_list_type" NOT NULL DEFAULT 'CUSTOM',
        "description" TEXT,
        "targetDate" DATE,
        "completedDate" DATE,
        "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
        "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
        "totalItems" INT NOT NULL DEFAULT 0,
        "openItems" INT NOT NULL DEFAULT 0,
        "inProgressItems" INT NOT NULL DEFAULT 0,
        "completedItems" INT NOT NULL DEFAULT 0,
        "createdById" UUID NOT NULL,
        "updatedById" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_punch_lists_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_lists_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_punch_lists_updatedBy" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes for punch_lists
    await queryRunner.query(`
      CREATE INDEX "IDX_punch_lists_project_type" ON "punch_lists" ("projectId", "type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_lists_project_created" ON "punch_lists" ("projectId", "createdAt");
    `);

    // Create punch_items table
    await queryRunner.query(`
      CREATE TABLE "punch_items" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "punchListId" UUID NOT NULL,
        "projectId" UUID NOT NULL,
        "locationId" UUID,
        "itemNumber" SERIAL,
        "description" TEXT NOT NULL,
        "status" "punch_item_status" NOT NULL DEFAULT 'OPEN',
        "priority" "punch_item_priority" NOT NULL DEFAULT 'MEDIUM',
        "category" "punch_item_category" NOT NULL DEFAULT 'OTHER',
        "ballInCourt" "ball_in_court" NOT NULL DEFAULT 'SUBCONTRACTOR',
        "trade" VARCHAR(255),
        "responsibleCompany" VARCHAR(255),
        "assignedToId" UUID,
        "costCode" VARCHAR(100),
        "dueDate" DATE,
        "completedDate" DATE,
        "resolutionNotes" TEXT,
        "rejectionReason" TEXT,
        "estimatedCost" DECIMAL(12, 2),
        "actualCost" DECIMAL(12, 2),
        "estimatedHours" INT,
        "actualHours" INT,
        "createdById" UUID NOT NULL,
        "updatedById" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_punch_items_punch_list" FOREIGN KEY ("punchListId") REFERENCES "punch_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_items_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_items_location" FOREIGN KEY ("locationId") REFERENCES "project_locations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_punch_items_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_punch_items_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_punch_items_updatedBy" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes for punch_items
    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_list_status" ON "punch_items" ("punchListId", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_project_status" ON "punch_items" ("projectId", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_location" ON "punch_items" ("locationId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_assigned" ON "punch_items" ("assignedToId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_ball_status" ON "punch_items" ("ballInCourt", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_priority_status" ON "punch_items" ("priority", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_items_due_date" ON "punch_items" ("dueDate");
    `);

    // Create punch_item_photos table
    await queryRunner.query(`
      CREATE TABLE "punch_item_photos" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "punchItemId" UUID NOT NULL,
        "type" "photo_type" NOT NULL DEFAULT 'BEFORE',
        "url" VARCHAR(500) NOT NULL,
        "thumbnailUrl" VARCHAR(500),
        "fileName" VARCHAR(255) NOT NULL,
        "mimeType" VARCHAR(100),
        "fileSize" INT,
        "caption" VARCHAR(500),
        "sortOrder" INT NOT NULL DEFAULT 0,
        "metadata" JSONB,
        "s3Bucket" VARCHAR(255),
        "s3Key" VARCHAR(500),
        "uploadedById" UUID NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_punch_item_photos_item" FOREIGN KEY ("punchItemId") REFERENCES "punch_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_item_photos_uploadedBy" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);

    // Create indexes for punch_item_photos
    await queryRunner.query(`
      CREATE INDEX "IDX_punch_item_photos_item_type" ON "punch_item_photos" ("punchItemId", "type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_item_photos_item_created" ON "punch_item_photos" ("punchItemId", "createdAt");
    `);

    // Create punch_item_history table
    await queryRunner.query(`
      CREATE TABLE "punch_item_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "punchItemId" UUID NOT NULL,
        "action" "history_action" NOT NULL,
        "description" TEXT,
        "comment" TEXT,
        "changes" JSONB,
        "metadata" JSONB,
        "createdById" UUID NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_punch_item_history_item" FOREIGN KEY ("punchItemId") REFERENCES "punch_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_punch_item_history_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);

    // Create indexes for punch_item_history
    await queryRunner.query(`
      CREATE INDEX "IDX_punch_item_history_item_created" ON "punch_item_history" ("punchItemId", "createdAt");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_punch_item_history_item_action" ON "punch_item_history" ("punchItemId", "action");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "punch_item_history" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "punch_item_photos" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "punch_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "punch_lists" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_locations_closure" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_locations" CASCADE;`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "history_action";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "photo_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ball_in_court";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "punch_item_category";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "punch_item_priority";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "punch_item_status";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "punch_list_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "location_type";`);
  }
}
