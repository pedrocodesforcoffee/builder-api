-- ========================================
-- Change Order Management System Tables
-- ========================================
-- Creates tables for:
-- - Potential Change Orders (PCO) with cost tiers
-- - Owner Change Orders (OCO) with cost breakdowns
-- - Commitment Change Orders (CCO) with line items and T&M entries
-- - Change Order Packages with polymorphic items
--
-- Run this migration to create the change order system tables
-- PostgreSQL 9.4+ compatible
-- ========================================

-- ========================================
-- STEP 1: Create tables without cross-references
-- ========================================

-- Potential Change Orders table (without converted_to_oco_id FK)
CREATE TABLE IF NOT EXISTS "potential_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "prime_contract_id" uuid NOT NULL REFERENCES "prime_contracts"("id") ON DELETE CASCADE,

  -- Identification
  "pco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status workflow
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "priority" varchar(50) DEFAULT 'MEDIUM',

  -- Financial summary (computed from cost tiers)
  "direct_cost" decimal(15,2) NOT NULL DEFAULT 0,
  "overhead_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "overhead_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "profit_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "profit_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "contingency_amount" decimal(15,2) NOT NULL DEFAULT 0,
  "contingency_percent" decimal(5,2) NOT NULL DEFAULT 0,
  "total_amount" decimal(15,2) NOT NULL DEFAULT 0,

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

  -- Conversion tracking (FK will be added later)
  "converted_to_oco_id" uuid,
  "converted_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_pco_number" UNIQUE ("project_id", "pco_number"),
  CONSTRAINT "CHK_pco_status" CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED')),
  CONSTRAINT "CHK_pco_priority" CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

COMMENT ON TABLE "potential_change_orders" IS 'Potential Change Orders - upstream change tracking with multi-tier cost breakdowns';

-- Owner Change Orders table (without pco_id FK initially)
CREATE TABLE IF NOT EXISTS "owner_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "prime_contract_id" uuid NOT NULL REFERENCES "prime_contracts"("id") ON DELETE CASCADE,
  "pco_id" uuid,

  -- Identification
  "oco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status and type
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "change_type" varchar(50) NOT NULL,
  "priority" varchar(50) DEFAULT 'MEDIUM',

  -- Financial
  "amount" decimal(15,2) NOT NULL,

  -- Schedule impact
  "schedule_impact_days" int DEFAULT 0,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejection_reason" text,
  "executed_at" timestamptz,
  "executed_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_oco_number" UNIQUE ("project_id", "oco_number"),
  CONSTRAINT "CHK_oco_status" CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED')),
  CONSTRAINT "CHK_oco_change_type" CHECK (change_type IN ('SCOPE_CHANGE', 'DESIGN_CHANGE', 'UNFORESEEN_CONDITIONS', 'OWNER_REQUEST', 'VALUE_ENGINEERING', 'REGULATORY', 'OTHER')),
  CONSTRAINT "CHK_oco_priority" CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

COMMENT ON TABLE "owner_change_orders" IS 'Owner Change Orders - formal changes to prime contracts';

-- Commitment Change Orders table (without oco_id FK initially)
CREATE TABLE IF NOT EXISTS "commitment_change_orders" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "commitment_id" uuid NOT NULL REFERENCES "commitments"("id") ON DELETE CASCADE,
  "oco_id" uuid,

  -- Identification
  "cco_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status and type
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
  "change_type" varchar(50) NOT NULL,
  "priority" varchar(50) DEFAULT 'MEDIUM',

  -- Financial
  "amount" decimal(15,2) NOT NULL,

  -- Time & Material support
  "is_time_and_material" boolean NOT NULL DEFAULT false,

  -- Schedule impact
  "schedule_impact_days" int DEFAULT 0,

  -- Workflow tracking
  "submitted_at" timestamptz,
  "submitted_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejected_at" timestamptz,
  "rejected_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rejection_reason" text,
  "executed_at" timestamptz,
  "executed_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_cco_number" UNIQUE ("commitment_id", "cco_number"),
  CONSTRAINT "CHK_cco_status" CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED')),
  CONSTRAINT "CHK_cco_change_type" CHECK (change_type IN ('SCOPE_ADDITION', 'SCOPE_REDUCTION', 'UNIT_PRICE_CHANGE', 'TIME_EXTENSION', 'UNFORESEEN_CONDITIONS', 'OTHER')),
  CONSTRAINT "CHK_cco_priority" CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

COMMENT ON TABLE "commitment_change_orders" IS 'Commitment Change Orders - changes to subcontracts/POs';

-- Change Order Packages table
CREATE TABLE IF NOT EXISTS "change_order_packages" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,

  -- Package details
  "package_number" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,

  -- Status
  "status" varchar(50) NOT NULL DEFAULT 'DRAFT',

  -- Financial summary
  "total_amount" decimal(15,2) NOT NULL DEFAULT 0,

  -- Workflow
  "submitted_at" timestamptz,
  "approved_at" timestamptz,

  -- Audit
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,

  CONSTRAINT "UQ_package_number" UNIQUE ("project_id", "package_number"),
  CONSTRAINT "CHK_package_status" CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED'))
);

COMMENT ON TABLE "change_order_packages" IS 'Change Order Packages - grouping multiple COs for batch processing';

-- ========================================
-- STEP 2: Create child tables with full FKs
-- ========================================

-- PCO Cost Tiers table
CREATE TABLE IF NOT EXISTS "pco_cost_tiers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "pco_id" uuid NOT NULL REFERENCES "potential_change_orders"("id") ON DELETE CASCADE,

  -- Cost code mapping
  "cost_code_id" uuid REFERENCES "cost_codes"("id") ON DELETE SET NULL,
  "description" text NOT NULL,

  -- Cost breakdown
  "quantity" decimal(15,4),
  "unit" varchar(50),
  "unit_cost" decimal(15,2),
  "direct_cost" decimal(15,2) NOT NULL,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "pco_cost_tiers" IS 'PCO Cost Tiers - multi-tier cost breakdown for PCOs';

-- OCO Cost Breakdowns table
CREATE TABLE IF NOT EXISTS "oco_cost_breakdowns" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "oco_id" uuid NOT NULL REFERENCES "owner_change_orders"("id") ON DELETE CASCADE,

  -- Cost code mapping for budget integration
  "cost_code_id" uuid NOT NULL REFERENCES "cost_codes"("id") ON DELETE CASCADE,
  "amount" decimal(15,2) NOT NULL,
  "description" text,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "oco_cost_breakdowns" IS 'OCO Cost Breakdowns - cost code mapping for budget integration';

-- CCO Line Items table
CREATE TABLE IF NOT EXISTS "cco_line_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cco_id" uuid NOT NULL REFERENCES "commitment_change_orders"("id") ON DELETE CASCADE,

  -- Line item details
  "description" text NOT NULL,
  "quantity" decimal(15,4) NOT NULL,
  "unit" varchar(50) NOT NULL,
  "unit_cost" decimal(15,2) NOT NULL,
  "total_cost" decimal(15,2) NOT NULL,

  -- Cost code mapping
  "cost_code_id" uuid REFERENCES "cost_codes"("id") ON DELETE SET NULL,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "cco_line_items" IS 'CCO Line Items - itemized cost breakdown for CCOs';

-- CCO T&M Entries table
CREATE TABLE IF NOT EXISTS "cco_tm_entries" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cco_id" uuid NOT NULL REFERENCES "commitment_change_orders"("id") ON DELETE CASCADE,

  -- Date tracking
  "date" date NOT NULL,

  -- Labor
  "labor_hours" decimal(8,2),
  "labor_rate" decimal(10,2),
  "labor_cost" decimal(15,2),

  -- Equipment
  "equipment_hours" decimal(8,2),
  "equipment_rate" decimal(10,2),
  "equipment_cost" decimal(15,2),

  -- Materials
  "material_cost" decimal(15,2),

  -- Other
  "other_cost" decimal(15,2),

  -- Total and description
  "total_cost" decimal(15,2) NOT NULL,
  "description" text,

  -- Approval
  "approved" boolean NOT NULL DEFAULT false,
  "approved_at" timestamptz,
  "approved_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,

  -- Timestamps
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "cco_tm_entries" IS 'CCO Time & Material Entries - daily T&M tracking for CCOs';

-- Change Order Package Items table
CREATE TABLE IF NOT EXISTS "change_order_package_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "package_id" uuid NOT NULL REFERENCES "change_order_packages"("id") ON DELETE CASCADE,

  -- Polymorphic relationship
  "change_order_type" varchar(50) NOT NULL,
  "pco_id" uuid REFERENCES "potential_change_orders"("id") ON DELETE CASCADE,
  "oco_id" uuid REFERENCES "owner_change_orders"("id") ON DELETE CASCADE,
  "cco_id" uuid REFERENCES "commitment_change_orders"("id") ON DELETE CASCADE,

  -- Display order
  "order" int NOT NULL DEFAULT 0,

  -- Timestamp
  "created_at" timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT "CHK_package_item_type" CHECK (change_order_type IN ('PCO', 'OCO', 'CCO')),
  CONSTRAINT "CHK_package_item_reference" CHECK (
    (change_order_type = 'PCO' AND pco_id IS NOT NULL AND oco_id IS NULL AND cco_id IS NULL) OR
    (change_order_type = 'OCO' AND pco_id IS NULL AND oco_id IS NOT NULL AND cco_id IS NULL) OR
    (change_order_type = 'CCO' AND pco_id IS NULL AND oco_id IS NULL AND cco_id IS NOT NULL)
  )
);

COMMENT ON TABLE "change_order_package_items" IS 'Change Order Package Items - polymorphic items within packages';

-- ========================================
-- STEP 3: Add cross-reference foreign keys
-- ========================================

-- Add FK from potential_change_orders to owner_change_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_pco_converted_to_oco'
  ) THEN
    ALTER TABLE "potential_change_orders"
      ADD CONSTRAINT "FK_pco_converted_to_oco"
      FOREIGN KEY ("converted_to_oco_id")
      REFERENCES "owner_change_orders"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

-- Add FK from owner_change_orders to potential_change_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_oco_pco'
  ) THEN
    ALTER TABLE "owner_change_orders"
      ADD CONSTRAINT "FK_oco_pco"
      FOREIGN KEY ("pco_id")
      REFERENCES "potential_change_orders"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

-- Add FK from commitment_change_orders to owner_change_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_cco_oco'
  ) THEN
    ALTER TABLE "commitment_change_orders"
      ADD CONSTRAINT "FK_cco_oco"
      FOREIGN KEY ("oco_id")
      REFERENCES "owner_change_orders"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

-- ========================================
-- STEP 4: Create indexes (PostgreSQL 9.4 compatible)
-- ========================================

-- Potential Change Orders indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pco_project') THEN
    CREATE INDEX "IDX_pco_project" ON "potential_change_orders"("project_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pco_prime_contract') THEN
    CREATE INDEX "IDX_pco_prime_contract" ON "potential_change_orders"("prime_contract_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pco_status') THEN
    CREATE INDEX "IDX_pco_status" ON "potential_change_orders"("status");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pco_converted_to_oco') THEN
    CREATE INDEX "IDX_pco_converted_to_oco" ON "potential_change_orders"("converted_to_oco_id");
  END IF;
END$$;

-- PCO Cost Tiers indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_pco_tier_pco') THEN
    CREATE INDEX "IDX_pco_tier_pco" ON "pco_cost_tiers"("pco_id");
  END IF;
END$$;

-- Owner Change Orders indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_project') THEN
    CREATE INDEX "IDX_oco_project" ON "owner_change_orders"("project_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_prime_contract') THEN
    CREATE INDEX "IDX_oco_prime_contract" ON "owner_change_orders"("prime_contract_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_pco') THEN
    CREATE INDEX "IDX_oco_pco" ON "owner_change_orders"("pco_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_status') THEN
    CREATE INDEX "IDX_oco_status" ON "owner_change_orders"("status");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_change_type') THEN
    CREATE INDEX "IDX_oco_change_type" ON "owner_change_orders"("change_type");
  END IF;
END$$;

-- OCO Cost Breakdowns indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_oco_breakdown_oco') THEN
    CREATE INDEX "IDX_oco_breakdown_oco" ON "oco_cost_breakdowns"("oco_id");
  END IF;
END$$;

-- Commitment Change Orders indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_project') THEN
    CREATE INDEX "IDX_cco_project" ON "commitment_change_orders"("project_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_commitment') THEN
    CREATE INDEX "IDX_cco_commitment" ON "commitment_change_orders"("commitment_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_oco') THEN
    CREATE INDEX "IDX_cco_oco" ON "commitment_change_orders"("oco_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_status') THEN
    CREATE INDEX "IDX_cco_status" ON "commitment_change_orders"("status");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_change_type') THEN
    CREATE INDEX "IDX_cco_change_type" ON "commitment_change_orders"("change_type");
  END IF;
END$$;

-- CCO Line Items indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_line_item_cco') THEN
    CREATE INDEX "IDX_cco_line_item_cco" ON "cco_line_items"("cco_id");
  END IF;
END$$;

-- CCO T&M Entries indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_tm_entry_cco') THEN
    CREATE INDEX "IDX_cco_tm_entry_cco" ON "cco_tm_entries"("cco_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cco_tm_entry_date') THEN
    CREATE INDEX "IDX_cco_tm_entry_date" ON "cco_tm_entries"("date");
  END IF;
END$$;

-- Change Order Packages indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_co_package_project') THEN
    CREATE INDEX "IDX_co_package_project" ON "change_order_packages"("project_id");
  END IF;
END$$;

-- Change Order Package Items indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_co_package_item_package') THEN
    CREATE INDEX "IDX_co_package_item_package" ON "change_order_package_items"("package_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_co_package_item_pco') THEN
    CREATE INDEX "IDX_co_package_item_pco" ON "change_order_package_items"("pco_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_co_package_item_oco') THEN
    CREATE INDEX "IDX_co_package_item_oco" ON "change_order_package_items"("oco_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_co_package_item_cco') THEN
    CREATE INDEX "IDX_co_package_item_cco" ON "change_order_package_items"("cco_id");
  END IF;
END$$;

-- ========================================
-- Migration Complete
-- ========================================
