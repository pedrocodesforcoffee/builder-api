import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDailyReportTables1734800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "daily_report_status" AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "weather_condition" AS ENUM (
        'CLEAR',
        'PARTLY_CLOUDY',
        'CLOUDY',
        'RAIN',
        'STORM',
        'SNOW',
        'FOG'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "work_impact" AS ENUM (
        'NONE',
        'MINOR',
        'MODERATE',
        'MAJOR',
        'FULL_STOP'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "delay_type" AS ENUM (
        'WEATHER',
        'MATERIAL_SHORTAGE',
        'EQUIPMENT_FAILURE',
        'LABOR_SHORTAGE',
        'DESIGN_ISSUE',
        'OWNER_DELAY',
        'PERMIT',
        'SUBCONTRACTOR',
        'OTHER'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "incident_type" AS ENUM (
        'INJURY',
        'NEAR_MISS',
        'PROPERTY_DAMAGE',
        'SAFETY_VIOLATION',
        'ENVIRONMENTAL',
        'OTHER'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "incident_severity" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "inspection_result" AS ENUM (
        'PASS',
        'FAIL',
        'CONDITIONAL',
        'PENDING'
      );
    `);

    // Create main daily_reports table
    await queryRunner.query(`
      CREATE TABLE "daily_reports" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "reportDate" date NOT NULL,

        "weatherConditionAm" weather_condition,
        "weatherConditionPm" weather_condition,
        "temperatureHigh" integer,
        "temperatureLow" integer,
        "precipitationInches" numeric(5,2),
        "windSpeedMph" integer,
        "humidity" integer,
        "weatherImpact" work_impact DEFAULT 'NONE',
        "weatherNotes" text,

        "workSummary" text,
        "generalNotes" text,
        "tomorrowPlan" text,

        "totalWorkers" integer DEFAULT 0,
        "totalManHours" numeric(10,2) DEFAULT 0,

        "signatureData" text,
        "signedAt" timestamp with time zone,
        "signedIp" varchar(45),

        "status" daily_report_status NOT NULL DEFAULT 'DRAFT',
        "submittedAt" timestamp with time zone,
        "approvedAt" timestamp with time zone,
        "rejectionReason" text,

        "createdById" uuid NOT NULL,
        "approvedById" uuid,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedById" uuid,
        "deletedAt" timestamp with time zone,

        CONSTRAINT "FK_daily_reports_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_daily_reports_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id"),
        CONSTRAINT "FK_daily_reports_approvedById" FOREIGN KEY ("approvedById") REFERENCES "users"("id"),
        CONSTRAINT "FK_daily_reports_updatedById" FOREIGN KEY ("updatedById") REFERENCES "users"("id")
      );
    `);

    // Create unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_daily_reports_project_date"
      ON "daily_reports" ("projectId", "reportDate")
      WHERE "deletedAt" IS NULL;
    `);

    // Create query optimization indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_daily_reports_status" ON "daily_reports" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_daily_reports_createdBy" ON "daily_reports" ("createdById");
    `);

    // Create daily_manpower table
    await queryRunner.query(`
      CREATE TABLE "daily_manpower" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "tradeName" varchar(255) NOT NULL,
        "companyName" varchar(255) NOT NULL,
        "subcontractorId" uuid,
        "headcount" integer NOT NULL,
        "hoursWorked" numeric(5,2) NOT NULL,
        "overtimeHours" numeric(5,2),
        "costCode" varchar(50),
        "notes" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_manpower_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_manpower_report" ON "daily_manpower" ("dailyReportId");
    `);

    // Create daily_equipment table
    await queryRunner.query(`
      CREATE TABLE "daily_equipment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "equipmentName" varchar(255) NOT NULL,
        "equipmentId" varchar(100),
        "quantity" integer NOT NULL DEFAULT 1,
        "hoursUsed" numeric(5,2) NOT NULL,
        "idleHours" numeric(5,2),
        "operatorName" varchar(255),
        "maintenanceIssues" text,
        "fuelUsed" numeric(10,2),
        "fuelUnit" varchar(20),
        "notes" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_equipment_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_equipment_report" ON "daily_equipment" ("dailyReportId");
    `);

    // Create daily_work table
    await queryRunner.query(`
      CREATE TABLE "daily_work" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "location" varchar(255) NOT NULL,
        "activity" text NOT NULL,
        "costCode" varchar(50),
        "percentComplete" numeric(5,2),
        "quantityInstalled" numeric(10,2),
        "unit" varchar(50),
        "issues" text,
        "photos" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_work_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_work_report" ON "daily_work" ("dailyReportId");
    `);

    // Create daily_materials table
    await queryRunner.query(`
      CREATE TABLE "daily_materials" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "materialName" varchar(255) NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "unit" varchar(50) NOT NULL,
        "supplier" varchar(255),
        "costCode" varchar(50),
        "isDelivery" boolean DEFAULT false,
        "isInstalled" boolean DEFAULT false,
        "deliveryTicketNumber" varchar(100),
        "notes" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_materials_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_materials_report" ON "daily_materials" ("dailyReportId");
    `);

    // Create daily_inspections table
    await queryRunner.query(`
      CREATE TABLE "daily_inspections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "inspectionType" varchar(255) NOT NULL,
        "inspectorName" varchar(255) NOT NULL,
        "inspectorCompany" varchar(255),
        "inspectorPhone" varchar(50),
        "result" inspection_result,
        "failedItems" text,
        "notes" text,
        "reportNumber" varchar(100),
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_inspections_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_inspections_report" ON "daily_inspections" ("dailyReportId");
    `);

    // Create daily_incidents table
    await queryRunner.query(`
      CREATE TABLE "daily_incidents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "type" incident_type NOT NULL,
        "severity" incident_severity NOT NULL,
        "description" text NOT NULL,
        "injuredParty" varchar(255),
        "witnessNames" text,
        "actionTaken" text,
        "oshaRecordable" boolean DEFAULT false,
        "lostTime" boolean DEFAULT false,
        "reportNumber" varchar(100),
        "notifiedAuthorities" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_incidents_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_incidents_report" ON "daily_incidents" ("dailyReportId");
    `);

    // Create daily_visitors table
    await queryRunner.query(`
      CREATE TABLE "daily_visitors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "visitorName" varchar(255) NOT NULL,
        "company" varchar(255),
        "purpose" varchar(255),
        "timeIn" varchar(50),
        "timeOut" varchar(50),
        "badgeNumber" varchar(50),
        "notes" text,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_visitors_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_visitors_report" ON "daily_visitors" ("dailyReportId");
    `);

    // Create daily_delays table
    await queryRunner.query(`
      CREATE TABLE "daily_delays" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dailyReportId" uuid NOT NULL,
        "type" delay_type NOT NULL,
        "description" text NOT NULL,
        "hoursLost" numeric(5,2) NOT NULL,
        "impact" work_impact NOT NULL,
        "affectedTrades" text,
        "potentialClaim" boolean DEFAULT false,
        "claimNumber" varchar(100),
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),

        CONSTRAINT "FK_daily_delays_dailyReportId" FOREIGN KEY ("dailyReportId")
          REFERENCES "daily_reports"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_delays_report" ON "daily_delays" ("dailyReportId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables (in reverse order of creation)
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_delays" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_visitors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_incidents" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_inspections" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_materials" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_work" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_equipment" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_manpower" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_reports" CASCADE;`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "inspection_result";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_severity";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incident_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delay_type";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_impact";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "weather_condition";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "daily_report_status";`);
  }
}
