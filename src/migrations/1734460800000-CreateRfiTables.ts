import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRfiTables1734460800000 implements MigrationInterface {
  name = 'CreateRfiTables1734460800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "rfi_status_enum" AS ENUM (
        'DRAFT', 'OPEN', 'ANSWERED', 'CLOSED', 'VOID'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rfi_priority_enum" AS ENUM (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rfi_discipline_enum" AS ENUM (
        'ARCHITECTURAL', 'STRUCTURAL', 'MECHANICAL', 'ELECTRICAL',
        'PLUMBING', 'FIRE_PROTECTION', 'CIVIL', 'LANDSCAPE', 'GENERAL', 'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ball_in_court_enum" AS ENUM (
        'ASSIGNEE', 'CREATOR', 'MANAGER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rfi_response_type_enum" AS ENUM (
        'RESPONSE', 'CLARIFICATION', 'COMMENT', 'FORWARD', 'DELEGATION'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rfi_history_action_enum" AS ENUM (
        'CREATED', 'OPENED', 'ASSIGNED', 'REASSIGNED', 'FORWARDED',
        'RESPONDED', 'ANSWERED', 'CLOSED', 'REOPENED', 'VOIDED',
        'EDITED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED',
        'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED', 'DISTRIBUTION_UPDATED', 'COMMENT_ADDED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "rfi_reference_type_enum" AS ENUM (
        'DRAWING', 'SPECIFICATION', 'SUBMITTAL', 'RFI',
        'CHANGE_ORDER', 'DOCUMENT', 'PHOTO', 'MARKUP'
      )
    `);

    // Create rfis table
    await queryRunner.query(`
      CREATE TABLE "rfis" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "number" varchar(50) NOT NULL,
        "sequenceNumber" int NOT NULL,
        "subject" varchar(255) NOT NULL,
        "question" text NOT NULL,
        "questionHtml" text,
        "status" "rfi_status_enum" DEFAULT 'DRAFT',
        "priority" "rfi_priority_enum" DEFAULT 'MEDIUM',
        "discipline" "rfi_discipline_enum" DEFAULT 'GENERAL',
        "location" varchar(255),
        "locationData" jsonb,
        "dueDate" timestamptz,
        "responseDate" timestamptz,
        "sentDate" timestamptz,
        "closedDate" timestamptz,
        "hasCostImpact" boolean DEFAULT false,
        "estimatedCostImpact" decimal(15,2),
        "hasScheduleImpact" boolean DEFAULT false,
        "estimatedScheduleImpactDays" int,
        "impactDescription" text,
        "assignedToId" uuid REFERENCES "users"("id"),
        "assignedToOrgId" uuid REFERENCES "organizations"("id"),
        "ballInCourt" "ball_in_court_enum" DEFAULT 'ASSIGNEE',
        "ballInCourtUserId" uuid REFERENCES "users"("id"),
        "createdById" uuid NOT NULL REFERENCES "users"("id"),
        "managerId" uuid REFERENCES "users"("id"),
        "distributionList" uuid[] DEFAULT '{}',
        "specSection" varchar(100),
        "drawingReferences" varchar[] DEFAULT '{}',
        "officialResponse" text,
        "officialResponseHtml" text,
        "responseDays" int,
        "slaResponseDays" int DEFAULT 7,
        "isOverdue" boolean DEFAULT false,
        "daysOverdue" int,
        "isPrivate" boolean DEFAULT false,
        "voidReason" text,
        "linkedChangeOrderId" uuid,
        "metadata" jsonb,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_rfis_project_number" ON "rfis"("projectId", "number")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfis_project_status" ON "rfis"("projectId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfis_project_assigned" ON "rfis"("projectId", "assignedToId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfis_project_due_date" ON "rfis"("projectId", "dueDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfis_project_discipline" ON "rfis"("projectId", "discipline")
    `);

    // Create rfi_responses table
    await queryRunner.query(`
      CREATE TABLE "rfi_responses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "rfiId" uuid NOT NULL REFERENCES "rfis"("id") ON DELETE CASCADE,
        "responseType" "rfi_response_type_enum" DEFAULT 'RESPONSE',
        "response" text NOT NULL,
        "responseHtml" text,
        "responderId" uuid NOT NULL REFERENCES "users"("id"),
        "attachmentIds" uuid[] DEFAULT '{}',
        "isOfficial" boolean DEFAULT false,
        "forwardedToId" uuid REFERENCES "users"("id"),
        "forwardNote" text,
        "isInternal" boolean DEFAULT false,
        "createdAt" timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_rfi_responses_rfi_created" ON "rfi_responses"("rfiId", "createdAt")
    `);

    // Create rfi_history table
    await queryRunner.query(`
      CREATE TABLE "rfi_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "rfiId" uuid NOT NULL REFERENCES "rfis"("id") ON DELETE CASCADE,
        "action" "rfi_history_action_enum" NOT NULL,
        "performedById" uuid NOT NULL REFERENCES "users"("id"),
        "description" text NOT NULL,
        "previousValue" jsonb,
        "newValue" jsonb,
        "relatedEntityId" uuid,
        "relatedEntityType" varchar(50),
        "createdAt" timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_rfi_history_rfi_created" ON "rfi_history"("rfiId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfi_history_performed_by" ON "rfi_history"("performedById")
    `);

    // Create rfi_references table
    await queryRunner.query(`
      CREATE TABLE "rfi_references" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "rfiId" uuid NOT NULL REFERENCES "rfis"("id") ON DELETE CASCADE,
        "referenceType" "rfi_reference_type_enum" NOT NULL,
        "referenceId" uuid NOT NULL,
        "referenceNumber" varchar(100) NOT NULL,
        "referenceTitle" varchar(255),
        "referenceLocation" varchar(100),
        "calloutData" jsonb,
        "notes" text,
        "createdById" uuid NOT NULL REFERENCES "users"("id"),
        "createdAt" timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_rfi_references_rfi_type" ON "rfi_references"("rfiId", "referenceType")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_rfi_references_ref" ON "rfi_references"("referenceId", "referenceType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rfi_references"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfi_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfi_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rfis"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_reference_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_history_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_response_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ball_in_court_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_discipline_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rfi_status_enum"`);
  }
}
