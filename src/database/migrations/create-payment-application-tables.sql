-- ========================================
-- Payment Application System Tables
-- ========================================
-- Creates tables for:
-- - Schedule of Values (SOV)
-- - Schedule of Values Items
-- - Payment Applications (AIA G702/G703)
-- - Payment Application Items
-- - Lien Waivers
--
-- Run this migration to create the payment application system tables
-- ========================================

-- Schedule of Values table
CREATE TABLE IF NOT EXISTS "schedule_of_values" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "commitment_id" uuid NOT NULL REFERENCES "commitments"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "total_contract_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "retention_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "is_locked" boolean NOT NULL DEFAULT false,
  "locked_at" timestamptz,
  "locked_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_sov_commitment" UNIQUE ("commitment_id")
);

-- Schedule of Values Items table
CREATE TABLE IF NOT EXISTS "schedule_of_values_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sov_id" uuid NOT NULL REFERENCES "schedule_of_values"("id") ON DELETE CASCADE,
  "item_number" int NOT NULL,
  "description" text NOT NULL,
  "scheduled_value" decimal(15,2) NOT NULL,
  "cost_code_id" uuid REFERENCES "cost_codes"("id") ON DELETE SET NULL,
  "notes" text,
  "order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT "UQ_sov_item_number" UNIQUE ("sov_id", "item_number")
);

-- Payment Applications table
CREATE TABLE IF NOT EXISTS "payment_applications" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "commitment_id" uuid NOT NULL REFERENCES "commitments"("id") ON DELETE CASCADE,
  "sov_id" uuid NOT NULL REFERENCES "schedule_of_values"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "application_number" int NOT NULL,
  "application_date" date NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',

  -- AIA G702 Calculations
  "total_completed_and_stored" decimal(15,2) NOT NULL DEFAULT 0,
  "retainage_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "retainage_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "total_earned_less_retainage" decimal(15,2) NOT NULL DEFAULT 0,
  "previous_payments" decimal(15,2) NOT NULL DEFAULT 0,
  "current_payment_due" decimal(15,2) NOT NULL DEFAULT 0,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamptz,
  "reviewed_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejection_reason" text,
  "paid_at" timestamptz,
  "paid_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "payment_date" date,
  "check_number" varchar(100),

  -- Lien waiver tracking
  "conditional_waiver_received" boolean NOT NULL DEFAULT false,
  "unconditional_waiver_received" boolean NOT NULL DEFAULT false,

  -- Notes
  "notes" text,
  "internal_notes" text,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_payment_app_number" UNIQUE ("commitment_id", "application_number"),
  CONSTRAINT "CHK_payment_app_status" CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'VOID'))
);

-- Payment Application Items table (G703 line items)
CREATE TABLE IF NOT EXISTS "payment_application_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "payment_application_id" uuid NOT NULL REFERENCES "payment_applications"("id") ON DELETE CASCADE,
  "sov_item_id" uuid NOT NULL REFERENCES "schedule_of_values_items"("id") ON DELETE CASCADE,

  -- G703 Columns
  "work_completed_from_previous" decimal(15,2) NOT NULL DEFAULT 0,
  "work_completed_this_period" decimal(15,2) NOT NULL DEFAULT 0,
  "materials_stored_previous" decimal(15,2) NOT NULL DEFAULT 0,
  "materials_stored_this_period" decimal(15,2) NOT NULL DEFAULT 0,
  "total_completed_and_stored" decimal(15,2) NOT NULL DEFAULT 0,
  "percent_complete" decimal(5,2) NOT NULL DEFAULT 0,

  -- Notes
  "notes" text,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT "UQ_pay_app_item" UNIQUE ("payment_application_id", "sov_item_id")
);

-- Lien Waivers table
CREATE TABLE IF NOT EXISTS "lien_waivers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "payment_application_id" uuid NOT NULL REFERENCES "payment_applications"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'REQUESTED',
  "amount" decimal(15,2) NOT NULL,
  "through_date" date NOT NULL,
  "waiver_date" date,
  "received_date" date,
  "document_url" text,
  "notes" text,
  "requested_at" timestamptz NOT NULL DEFAULT NOW(),
  "requested_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "CHK_lien_waiver_type" CHECK (type IN ('CONDITIONAL', 'UNCONDITIONAL', 'PARTIAL_CONDITIONAL', 'PARTIAL_UNCONDITIONAL', 'FINAL_CONDITIONAL', 'FINAL_UNCONDITIONAL')),
  CONSTRAINT "CHK_lien_waiver_status" CHECK (status IN ('REQUESTED', 'RECEIVED', 'APPROVED', 'REJECTED'))
);

-- Indexes for performance
-- Using DO blocks for PostgreSQL 9.4 compatibility (IF NOT EXISTS not supported in 9.4)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_sov_commitment') THEN
    CREATE INDEX "IDX_sov_commitment" ON "schedule_of_values"("commitment_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_sov_project') THEN
    CREATE INDEX "IDX_sov_project" ON "schedule_of_values"("project_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_sov_items_sov') THEN
    CREATE INDEX "IDX_sov_items_sov" ON "schedule_of_values_items"("sov_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_sov_items_cost_code') THEN
    CREATE INDEX "IDX_sov_items_cost_code" ON "schedule_of_values_items"("cost_code_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_commitment') THEN
    CREATE INDEX "IDX_pay_app_commitment" ON "payment_applications"("commitment_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_sov') THEN
    CREATE INDEX "IDX_pay_app_sov" ON "payment_applications"("sov_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_project') THEN
    CREATE INDEX "IDX_pay_app_project" ON "payment_applications"("project_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_status') THEN
    CREATE INDEX "IDX_pay_app_status" ON "payment_applications"("status");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_items_pay_app') THEN
    CREATE INDEX "IDX_pay_app_items_pay_app" ON "payment_application_items"("payment_application_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pay_app_items_sov_item') THEN
    CREATE INDEX "IDX_pay_app_items_sov_item" ON "payment_application_items"("sov_item_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_lien_waiver_pay_app') THEN
    CREATE INDEX "IDX_lien_waiver_pay_app" ON "lien_waivers"("payment_application_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_lien_waiver_project') THEN
    CREATE INDEX "IDX_lien_waiver_project" ON "lien_waivers"("project_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_lien_waiver_status') THEN
    CREATE INDEX "IDX_lien_waiver_status" ON "lien_waivers"("status");
  END IF;
END$$;

-- Comments for documentation
COMMENT ON TABLE "schedule_of_values" IS 'Schedule of Values (SOV) for progress billing breakdown';
COMMENT ON TABLE "schedule_of_values_items" IS 'Line items in the Schedule of Values';
COMMENT ON TABLE "payment_applications" IS 'Payment applications (AIA G702/G703 forms)';
COMMENT ON TABLE "payment_application_items" IS 'Line item detail for payment applications (G703)';
COMMENT ON TABLE "lien_waivers" IS 'Lien waiver documents tracking';

COMMENT ON COLUMN "payment_applications"."total_completed_and_stored" IS 'Column G - Total work completed and materials stored to date';
COMMENT ON COLUMN "payment_applications"."retainage_amount" IS 'Amount withheld as retainage';
COMMENT ON COLUMN "payment_applications"."total_earned_less_retainage" IS 'Total earned minus retainage';
COMMENT ON COLUMN "payment_applications"."previous_payments" IS 'Sum of all previous payments';
COMMENT ON COLUMN "payment_applications"."current_payment_due" IS 'Amount due this payment period';

COMMENT ON COLUMN "payment_application_items"."work_completed_from_previous" IS 'G703 Column D - Work completed from previous applications';
COMMENT ON COLUMN "payment_application_items"."work_completed_this_period" IS 'G703 Column E - Work completed this period';
COMMENT ON COLUMN "payment_application_items"."materials_stored_previous" IS 'G703 Column F - Materials presently stored (previous)';
COMMENT ON COLUMN "payment_application_items"."materials_stored_this_period" IS 'G703 Column F - Materials presently stored (this period)';
COMMENT ON COLUMN "payment_application_items"."total_completed_and_stored" IS 'G703 Column G - Total completed and stored to date';
COMMENT ON COLUMN "payment_application_items"."percent_complete" IS 'G703 Column H - Percent complete';
