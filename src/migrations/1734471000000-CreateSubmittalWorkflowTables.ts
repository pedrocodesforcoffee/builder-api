import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubmittalWorkflowTables1734471000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "workflow_step_type_enum" AS ENUM (
        'REVIEW',
        'APPROVAL',
        'ACKNOWLEDGMENT',
        'DISTRIBUTION',
        'NOTIFICATION'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "reviewer_type_enum" AS ENUM (
        'USER',
        'ROLE',
        'COMPANY',
        'DISCIPLINE'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "routing_type_enum" AS ENUM (
        'SERIAL',
        'PARALLEL'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "workflow_step_status_enum" AS ENUM (
        'PENDING',
        'ACTIVE',
        'IN_PROGRESS',
        'COMPLETED',
        'SKIPPED',
        'CANCELLED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "distribution_method_enum" AS ENUM (
        'EMAIL',
        'IN_APP',
        'DOWNLOAD_LINK',
        'PHYSICAL'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "distribution_status_enum" AS ENUM (
        'PENDING',
        'SENT',
        'DELIVERED',
        'ACKNOWLEDGED',
        'FAILED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'SUBMITTAL_CREATED',
        'REVIEW_ASSIGNED',
        'REVIEW_OVERDUE',
        'SUBMITTAL_APPROVED',
        'SUBMITTAL_APPROVED_AS_NOTED',
        'SUBMITTAL_REJECTED',
        'REVISE_RESUBMIT',
        'WORKFLOW_STEP_ACTIVE',
        'WORKFLOW_STEP_COMPLETE',
        'LEAD_TIME_WARNING',
        'DISTRIBUTION_SENT',
        'DISTRIBUTION_ACKNOWLEDGED',
        'REVISION_SUBMITTED',
        'COMMENT_ADDED',
        'DOCUMENT_UPLOADED',
        'WORKFLOW_COMPLETE'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM (
        'PENDING',
        'SENT',
        'READ',
        'FAILED'
      );
    `);

    // 1. Create submittal_workflow_templates table
    await queryRunner.query(`
      CREATE TABLE "submittal_workflow_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NULL,
        "organizationId" uuid NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "applicableTypes" "submittal_type_enum"[] NULL,
        "specSectionPatterns" varchar[] DEFAULT '{}',
        "totalReviewDays" int NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "autoApply" boolean NOT NULL DEFAULT false,
        "priority" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submittal_workflow_template_project"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submittal_workflow_template_organization"
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_template_project_active"
        ON "submittal_workflow_templates" ("projectId", "isActive");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_template_org_default"
        ON "submittal_workflow_templates" ("organizationId", "isDefault");
    `);

    // 2. Create submittal_workflow_template_steps table
    await queryRunner.query(`
      CREATE TABLE "submittal_workflow_template_steps" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "templateId" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "stepType" "workflow_step_type_enum" NOT NULL,
        "stepOrder" int NOT NULL,
        "parallelGroupOrder" int NULL,
        "routingType" "routing_type_enum" NOT NULL DEFAULT 'SERIAL',
        "reviewerType" "reviewer_type_enum" NOT NULL,
        "reviewerUserId" uuid NULL,
        "reviewerRole" varchar(50) NULL,
        "reviewerCompanyId" uuid NULL,
        "reviewerDiscipline" varchar(50) NULL,
        "allowedDays" int NULL,
        "isOptional" boolean NOT NULL DEFAULT false,
        "requireAllParallel" boolean NOT NULL DEFAULT false,
        "canApprove" boolean NOT NULL DEFAULT true,
        "canReject" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_workflow_template_step_template"
          FOREIGN KEY ("templateId") REFERENCES "submittal_workflow_templates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_template_step_reviewer_user"
          FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_workflow_template_step_reviewer_company"
          FOREIGN KEY ("reviewerCompanyId") REFERENCES "organizations"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_template_step_template"
        ON "submittal_workflow_template_steps" ("templateId", "stepOrder");
    `);

    // 3. Create submittal_workflow_steps table
    await queryRunner.query(`
      CREATE TABLE "submittal_workflow_steps" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "templateStepId" uuid NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "stepType" "workflow_step_type_enum" NOT NULL,
        "stepOrder" int NOT NULL,
        "parallelGroupOrder" int NULL,
        "routingType" "routing_type_enum" NOT NULL DEFAULT 'SERIAL',
        "assignedToId" uuid NULL,
        "status" "workflow_step_status_enum" NOT NULL DEFAULT 'PENDING',
        "dueDate" timestamp with time zone NULL,
        "completedById" uuid NULL,
        "completedAt" timestamp with time zone NULL,
        "stamp" "approval_stamp_enum" NULL,
        "comments" text NULL,
        "conditions" text NULL,
        "signatureData" jsonb NULL,
        "isOptional" boolean NOT NULL DEFAULT false,
        "requireAllParallel" boolean NOT NULL DEFAULT false,
        "canApprove" boolean NOT NULL DEFAULT true,
        "canReject" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_workflow_step_submittal"
          FOREIGN KEY ("submittalId") REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_step_template_step"
          FOREIGN KEY ("templateStepId") REFERENCES "submittal_workflow_template_steps"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_workflow_step_assigned_to"
          FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_workflow_step_completed_by"
          FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_step_submittal_order"
        ON "submittal_workflow_steps" ("submittalId", "stepOrder");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_step_assigned_status"
        ON "submittal_workflow_steps" ("assignedToId", "status");
    `);

    // 4. Create submittal_distributions table
    await queryRunner.query(`
      CREATE TABLE "submittal_distributions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "recipientUserId" uuid NULL,
        "recipientOrgId" uuid NULL,
        "recipientEmail" varchar(255) NULL,
        "recipientName" varchar(255) NOT NULL,
        "method" "distribution_method_enum" NOT NULL DEFAULT 'EMAIL',
        "status" "distribution_status_enum" NOT NULL DEFAULT 'PENDING',
        "distributedById" uuid NOT NULL,
        "sentAt" timestamp with time zone NULL,
        "deliveredAt" timestamp with time zone NULL,
        "acknowledgedAt" timestamp with time zone NULL,
        "errorMessage" text NULL,
        "includeConditions" boolean NOT NULL DEFAULT true,
        "includeMarkups" boolean NOT NULL DEFAULT false,
        "coverNote" text NULL,
        "documentIds" uuid[] DEFAULT '{}',
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_distribution_submittal"
          FOREIGN KEY ("submittalId") REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_distribution_recipient_user"
          FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_distribution_recipient_org"
          FOREIGN KEY ("recipientOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_distribution_distributed_by"
          FOREIGN KEY ("distributedById") REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_distribution_submittal"
        ON "submittal_distributions" ("submittalId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_distribution_recipient_user"
        ON "submittal_distributions" ("recipientUserId", "status");
    `);

    // 5. Create submittal_lead_times table
    await queryRunner.query(`
      CREATE TABLE "submittal_lead_times" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "specSection" varchar(20) NULL,
        "submittalType" "submittal_type_enum" NULL,
        "fabricationDays" int NOT NULL,
        "deliveryDays" int NOT NULL,
        "reviewDays" int NOT NULL DEFAULT 14,
        "totalLeadTimeDays" int NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lead_time_project"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lead_time_project_spec"
        ON "submittal_lead_times" ("projectId", "specSection");
    `);

    // 6. Create submittal_notifications table
    await queryRunner.query(`
      CREATE TABLE "submittal_notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submittalId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "notificationType" "notification_type_enum" NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "bodyHtml" text NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'PENDING',
        "sentAt" timestamp with time zone NULL,
        "readAt" timestamp with time zone NULL,
        "errorMessage" text NULL,
        "deepLink" varchar(500) NULL,
        "metadata" jsonb NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notification_submittal"
          FOREIGN KEY ("submittalId") REFERENCES "submittals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_user_status_created"
        ON "submittal_notifications" ("userId", "status", "createdAt");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_submittal"
        ON "submittal_notifications" ("submittalId");
    `);

    // 7. Create project_submittal_settings table
    await queryRunner.query(`
      CREATE TABLE "project_submittal_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL UNIQUE,
        "defaultWorkflowTemplateId" uuid NULL,
        "autoDistributeOnApproval" boolean NOT NULL DEFAULT true,
        "sendOverdueReminders" boolean NOT NULL DEFAULT true,
        "sendLeadTimeWarnings" boolean NOT NULL DEFAULT true,
        "sendDailySummary" boolean NOT NULL DEFAULT false,
        "nonWorkingDays" int[] DEFAULT '{0,6}',
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_project_settings_project"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_settings_default_template"
          FOREIGN KEY ("defaultWorkflowTemplateId") REFERENCES "submittal_workflow_templates"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_settings_project"
        ON "project_submittal_settings" ("projectId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "project_submittal_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_lead_times" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_distributions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_workflow_steps" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_workflow_template_steps" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submittal_workflow_templates" CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "distribution_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "distribution_method_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workflow_step_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "routing_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reviewer_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workflow_step_type_enum";`);
  }
}
