import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubmittalTables1734470000000 implements MigrationInterface {
  name = 'CreateSubmittalTables1734470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "submittal_status_enum" AS ENUM (
        'NOT_STARTED',
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'APPROVED_AS_NOTED',
        'REVISE_RESUBMIT',
        'REJECTED',
        'CLOSED',
        'VOID'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "submittal_type_enum" AS ENUM (
        'PRODUCT_DATA',
        'SHOP_DRAWING',
        'SAMPLE',
        'MOCKUP',
        'CERTIFICATION',
        'TEST_REPORT',
        'DESIGN_DATA',
        'MANUFACTURER_INSTRUCTIONS',
        'OPERATION_MAINTENANCE_DATA',
        'CLOSEOUT',
        'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "submittal_priority_enum" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "submittal_item_type_enum" AS ENUM (
        'DOCUMENT',
        'DRAWING',
        'SAMPLE',
        'CATALOG_CUT',
        'CALCULATION',
        'CERTIFICATE',
        'WARRANTY',
        'TEST_REPORT',
        'PHOTO',
        'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "approval_stamp_enum" AS ENUM (
        'APPROVED',
        'APPROVED_AS_NOTED',
        'APPROVED_AS_NOTED_RESUBMIT',
        'REVISE_AND_RESUBMIT',
        'REJECTED',
        'FOR_RECORD_ONLY',
        'SEE_COMMENTS'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "submittal_history_action_enum" AS ENUM (
        'CREATED',
        'UPDATED',
        'SUBMITTED',
        'RECEIVED',
        'REVIEW_STARTED',
        'FORWARDED',
        'RESPONSE_ADDED',
        'APPROVED',
        'APPROVED_AS_NOTED',
        'REVISE_RESUBMIT',
        'REJECTED',
        'REVISION_CREATED',
        'CLOSED',
        'REOPENED',
        'VOIDED',
        'ITEM_ADDED',
        'ITEM_REMOVED',
        'ITEM_UPDATED',
        'ATTACHMENT_ADDED',
        'ATTACHMENT_REMOVED',
        'ASSIGNEE_CHANGED',
        'DUE_DATE_CHANGED',
        'DISTRIBUTED',
        'COMMENT_ADDED'
      )
    `);

    // Create submittals table
    await queryRunner.query(`
      CREATE TABLE "submittals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "number" varchar(50) NOT NULL,
        "sequenceNumber" int NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "specSection" varchar(20) NOT NULL,
        "specSectionTitle" varchar(255),
        "specParagraph" varchar(50),
        "submittalType" "submittal_type_enum" NOT NULL DEFAULT 'PRODUCT_DATA',
        "status" "submittal_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
        "priority" "submittal_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "currentRevision" int NOT NULL DEFAULT 0,
        "responsibleContractorId" uuid NOT NULL,
        "preparedById" uuid,
        "submittalManagerId" uuid,
        "approverId" uuid,
        "approverOrgId" uuid,
        "dueDate" timestamp with time zone,
        "requiredOnSiteDate" timestamp with time zone,
        "submittedDate" timestamp with time zone,
        "receivedDate" timestamp with time zone,
        "reviewStartDate" timestamp with time zone,
        "approvedDate" timestamp with time zone,
        "closedDate" timestamp with time zone,
        "leadTimeDays" int,
        "reviewTimeDays" int NOT NULL DEFAULT 14,
        "scheduleActivityId" varchar(100),
        "scheduleActivityName" varchar(255),
        "location" varchar(255),
        "drawingReferences" varchar[] DEFAULT '{}',
        "relatedRfiIds" uuid[] DEFAULT '{}',
        "distributionList" uuid[] DEFAULT '{}',
        "hasCostImpact" boolean NOT NULL DEFAULT false,
        "estimatedCost" decimal(15,2),
        "approvalStamp" varchar(50),
        "approvalConditions" text,
        "rejectionReason" text,
        "voidReason" text,
        "isPrivate" boolean NOT NULL DEFAULT false,
        "isOverdue" boolean NOT NULL DEFAULT false,
        "daysOverdue" int,
        "daysInReview" int,
        "createdById" uuid NOT NULL,
        "metadata" jsonb,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittals_projectId" FOREIGN KEY ("projectId")
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittals_organizationId" FOREIGN KEY ("organizationId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittals_responsibleContractorId" FOREIGN KEY ("responsibleContractorId")
          REFERENCES "organizations"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_submittals_preparedById" FOREIGN KEY ("preparedById")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_submittals_submittalManagerId" FOREIGN KEY ("submittalManagerId")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_submittals_approverId" FOREIGN KEY ("approverId")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_submittals_approverOrgId" FOREIGN KEY ("approverOrgId")
          REFERENCES "organizations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_submittals_createdById" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);

    // Create indexes for submittals table
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_submittals_project_number"
        ON "submittals" ("projectId", "number")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittals_project_status"
        ON "submittals" ("projectId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittals_project_specSection"
        ON "submittals" ("projectId", "specSection")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittals_project_submittalType"
        ON "submittals" ("projectId", "submittalType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittals_project_responsibleContractor"
        ON "submittals" ("projectId", "responsibleContractorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittals_project_dueDate"
        ON "submittals" ("projectId", "dueDate")
    `);

    // Create submittal_items table
    await queryRunner.query(`
      CREATE TABLE "submittal_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "itemNumber" int NOT NULL,
        "description" varchar(255) NOT NULL,
        "notes" text,
        "itemType" "submittal_item_type_enum" NOT NULL DEFAULT 'DOCUMENT',
        "status" "submittal_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
        "manufacturer" varchar(255),
        "modelNumber" varchar(100),
        "productName" varchar(255),
        "quantity" int,
        "unitOfMeasure" varchar(20),
        "attachmentIds" uuid[] DEFAULT '{}',
        "pageReferences" varchar(100),
        "approvalStamp" varchar(50),
        "approvalNotes" text,
        "approvedById" uuid,
        "approvedAt" timestamp with time zone,
        "revisionNumber" int NOT NULL DEFAULT 0,
        "isSubstitution" boolean NOT NULL DEFAULT false,
        "substitutionJustification" text,
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittal_items_submittalId" FOREIGN KEY ("submittalId")
          REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittal_items_approvedById" FOREIGN KEY ("approvedById")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for submittal_items
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_items_submittalId"
        ON "submittal_items" ("submittalId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_items_itemNumber"
        ON "submittal_items" ("submittalId", "itemNumber")
    `);

    // Create submittal_revisions table
    await queryRunner.query(`
      CREATE TABLE "submittal_revisions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "revisionNumber" int NOT NULL,
        "revisionLabel" varchar(20) NOT NULL,
        "status" "submittal_status_enum" NOT NULL,
        "revisionReason" text,
        "changeDescription" text,
        "itemsSnapshot" jsonb,
        "attachmentIds" uuid[] DEFAULT '{}',
        "reviewerResponse" text,
        "reviewerStamp" varchar(50),
        "submittedDate" timestamp with time zone NOT NULL,
        "reviewedDate" timestamp with time zone,
        "submittedById" uuid NOT NULL,
        "reviewedById" uuid,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittal_revisions_submittalId" FOREIGN KEY ("submittalId")
          REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittal_revisions_submittedById" FOREIGN KEY ("submittedById")
          REFERENCES "users"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_submittal_revisions_reviewedById" FOREIGN KEY ("reviewedById")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for submittal_revisions
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_submittal_revisions_submittal_revision"
        ON "submittal_revisions" ("submittalId", "revisionNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_revisions_submittalId"
        ON "submittal_revisions" ("submittalId")
    `);

    // Create submittal_responses table
    await queryRunner.query(`
      CREATE TABLE "submittal_responses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "revisionId" uuid,
        "revisionNumber" int NOT NULL,
        "stamp" "approval_stamp_enum" NOT NULL,
        "resultingStatus" "submittal_status_enum" NOT NULL,
        "comments" text,
        "commentsHtml" text,
        "conditions" text,
        "markupAttachmentIds" uuid[] DEFAULT '{}',
        "reviewerId" uuid NOT NULL,
        "reviewerOrgId" uuid NOT NULL,
        "reviewerTitle" varchar(100),
        "signatureData" jsonb,
        "isOfficial" boolean NOT NULL DEFAULT false,
        "reviewDurationDays" int,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittal_responses_submittalId" FOREIGN KEY ("submittalId")
          REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittal_responses_revisionId" FOREIGN KEY ("revisionId")
          REFERENCES "submittal_revisions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_submittal_responses_reviewerId" FOREIGN KEY ("reviewerId")
          REFERENCES "users"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_submittal_responses_reviewerOrgId" FOREIGN KEY ("reviewerOrgId")
          REFERENCES "organizations"("id") ON DELETE NO ACTION
      )
    `);

    // Create indexes for submittal_responses
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_responses_submittalId"
        ON "submittal_responses" ("submittalId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_responses_createdAt"
        ON "submittal_responses" ("submittalId", "createdAt")
    `);

    // Create submittal_history table
    await queryRunner.query(`
      CREATE TABLE "submittal_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "action" "submittal_history_action_enum" NOT NULL,
        "performedById" uuid NOT NULL,
        "description" text NOT NULL,
        "revisionNumber" int,
        "previousValue" jsonb,
        "newValue" jsonb,
        "relatedEntityId" uuid,
        "relatedEntityType" varchar(50),
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittal_history_submittalId" FOREIGN KEY ("submittalId")
          REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittal_history_performedById" FOREIGN KEY ("performedById")
          REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);

    // Create indexes for submittal_history
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_history_submittalId"
        ON "submittal_history" ("submittalId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submittal_history_createdAt"
        ON "submittal_history" ("submittalId", "createdAt")
    `);

    // Create spec_sections table
    await queryRunner.query(`
      CREATE TABLE "spec_sections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "division" varchar(2) NOT NULL,
        "sectionNumber" varchar(20) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "responsibleContractorId" uuid,
        "defaultApproverId" uuid,
        "expectedSubmittalCount" int NOT NULL DEFAULT 0,
        "submittedCount" int NOT NULL DEFAULT 0,
        "approvedCount" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_spec_sections_projectId" FOREIGN KEY ("projectId")
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spec_sections_organizationId" FOREIGN KEY ("organizationId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spec_sections_responsibleContractorId" FOREIGN KEY ("responsibleContractorId")
          REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for spec_sections
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_spec_sections_project_section"
        ON "spec_sections" ("projectId", "sectionNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_spec_sections_project_division"
        ON "spec_sections" ("projectId", "division")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (child tables first)
    await queryRunner.query(`DROP TABLE IF EXISTS "spec_sections" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_responses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_revisions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittals" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "submittal_history_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_stamp_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submittal_item_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submittal_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submittal_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submittal_status_enum"`);
  }
}
