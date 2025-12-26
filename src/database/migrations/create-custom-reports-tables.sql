-- ================================================================
-- Custom Reports & Report Execution Tables
-- ================================================================
-- Created: 2025-12-10
-- Purpose: Custom Report Builder and Execution History Tracking
-- Dependencies: projects, users, report_schedules tables must exist
-- ================================================================

-- =============================================================================
-- TABLE: custom_reports
-- =============================================================================
-- Stores flexible, user-defined report configurations with dynamic query building
-- Features: 14 filter operators, 6 aggregation functions, public/private sharing

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Ownership & Project Scope
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Report Identification
  report_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Flexible JSONB Configuration
  -- Stores: primaryEntity, columns, filters, joins, aggregations, sorting, groupBy
  config JSONB NOT NULL,

  -- Sharing & Access Control
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Audit Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes for Performance
  CONSTRAINT custom_reports_pk PRIMARY KEY (id),
  CONSTRAINT custom_reports_project_fk FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT custom_reports_creator_fk FOREIGN KEY (created_by_id)
    REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_custom_reports_project_id ON custom_reports(project_id);
CREATE INDEX idx_custom_reports_created_by_id ON custom_reports(created_by_id);
CREATE INDEX idx_custom_reports_is_public ON custom_reports(is_public);
CREATE INDEX idx_custom_reports_created_at ON custom_reports(created_at DESC);

-- JSONB Indexes for Fast Config Queries
CREATE INDEX idx_custom_reports_config_primary_entity
  ON custom_reports USING GIN ((config->'primaryEntity'));

-- Full-Text Search on Report Names
CREATE INDEX idx_custom_reports_name_search
  ON custom_reports USING GIN (to_tsvector('english', report_name || ' ' || COALESCE(description, '')));

-- Comments
COMMENT ON TABLE custom_reports IS 'User-defined custom reports with flexible JSONB configuration';
COMMENT ON COLUMN custom_reports.config IS 'JSONB configuration: { primaryEntity, columns, filters, joins, aggregations, sorting, groupBy }';
COMMENT ON COLUMN custom_reports.is_public IS 'Public reports visible to all project members; private reports visible only to creator';

-- =============================================================================
-- TABLE: report_executions
-- =============================================================================
-- Complete audit trail for all report executions (scheduled and manual)
-- Tracks timing, file metadata, email delivery, and error information

CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links to Report Schedule (nullable for manual/custom report executions)
  report_schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,

  -- Links to Custom Report (nullable for standard report executions)
  custom_report_id UUID REFERENCES custom_reports(id) ON DELETE SET NULL,

  -- Project Context
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Execution Identity
  report_type VARCHAR(100) NOT NULL, -- e.g., 'budget-detail', 'wip', 'custom'
  report_name VARCHAR(255) NOT NULL,

  -- Execution Status & Timing
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER, -- Execution duration in milliseconds

  -- File Storage Metadata
  file_format VARCHAR(10) CHECK (file_format IN ('excel', 'pdf', 'csv')),
  file_url TEXT, -- S3/storage URL
  file_size INTEGER, -- File size in bytes
  file_name VARCHAR(255), -- Original filename

  -- Report Content Metadata
  row_count INTEGER, -- Number of data rows in report
  filter_params JSONB, -- Runtime filter parameters used

  -- Error Handling
  error_message TEXT, -- Error details if status = FAILED
  error_stack TEXT, -- Full error stack trace for debugging

  -- Email Delivery Tracking
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_recipients TEXT, -- Comma-separated list
  email_error TEXT, -- Email delivery error if any

  -- Triggered By (for audit trail)
  triggered_by VARCHAR(20) NOT NULL CHECK (triggered_by IN ('SCHEDULED', 'MANUAL', 'API')),
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT report_executions_pk PRIMARY KEY (id),
  CONSTRAINT report_executions_project_fk FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT report_executions_schedule_fk FOREIGN KEY (report_schedule_id)
    REFERENCES report_schedules(id) ON DELETE SET NULL,
  CONSTRAINT report_executions_custom_report_fk FOREIGN KEY (custom_report_id)
    REFERENCES custom_reports(id) ON DELETE SET NULL,
  CONSTRAINT report_executions_user_fk FOREIGN KEY (triggered_by_user_id)
    REFERENCES users(id) ON DELETE SET NULL,

  -- Business Rules
  CONSTRAINT report_executions_check_schedule_or_custom
    CHECK (report_schedule_id IS NOT NULL OR custom_report_id IS NOT NULL OR triggered_by = 'MANUAL'),
  CONSTRAINT report_executions_check_completed
    CHECK ((status IN ('SUCCESS', 'FAILED') AND completed_at IS NOT NULL) OR
           (status IN ('PENDING', 'RUNNING') AND completed_at IS NULL))
);

-- Indexes for Performance
CREATE INDEX idx_report_executions_project_id ON report_executions(project_id);
CREATE INDEX idx_report_executions_schedule_id ON report_executions(report_schedule_id);
CREATE INDEX idx_report_executions_custom_report_id ON report_executions(custom_report_id);
CREATE INDEX idx_report_executions_status ON report_executions(status);
CREATE INDEX idx_report_executions_started_at ON report_executions(started_at DESC);
CREATE INDEX idx_report_executions_report_type ON report_executions(report_type);
CREATE INDEX idx_report_executions_triggered_by ON report_executions(triggered_by);
CREATE INDEX idx_report_executions_email_sent ON report_executions(email_sent);

-- Composite Indexes for Common Queries
CREATE INDEX idx_report_executions_schedule_started
  ON report_executions(report_schedule_id, started_at DESC);
CREATE INDEX idx_report_executions_custom_started
  ON report_executions(custom_report_id, started_at DESC);
CREATE INDEX idx_report_executions_project_type_started
  ON report_executions(project_id, report_type, started_at DESC);

-- JSONB Index for Filter Params
CREATE INDEX idx_report_executions_filter_params
  ON report_executions USING GIN (filter_params);

-- Comments
COMMENT ON TABLE report_executions IS 'Complete audit trail for all report executions with timing, file metadata, and email delivery tracking';
COMMENT ON COLUMN report_executions.report_schedule_id IS 'NULL for manual or custom report executions';
COMMENT ON COLUMN report_executions.custom_report_id IS 'NULL for standard report executions';
COMMENT ON COLUMN report_executions.triggered_by IS 'Source of execution: SCHEDULED (cron), MANUAL (user), API (external)';
COMMENT ON COLUMN report_executions.duration_ms IS 'Execution duration in milliseconds for performance monitoring';
COMMENT ON COLUMN report_executions.filter_params IS 'JSONB of runtime filter parameters used for report generation';

-- =============================================================================
-- UPDATE TRIGGERS for updated_at
-- =============================================================================

-- Trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_custom_reports_updated_at
  BEFORE UPDATE ON custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_executions_updated_at
  BEFORE UPDATE ON report_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA (Optional - for development/testing)
-- =============================================================================

-- Example Custom Report: Budget Over/Under Budget Items
/*
INSERT INTO custom_reports (
  project_id,
  created_by_id,
  report_name,
  description,
  config,
  is_public
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with actual project ID
  '00000000-0000-0000-0000-000000000002', -- Replace with actual user ID
  'Budget Variance - Over Budget Items',
  'Shows all cost codes that are over budget by more than 10%',
  '{
    "primaryEntity": "BudgetLineItem",
    "columns": [
      {"field": "costCode.code", "label": "Cost Code", "dataType": "STRING"},
      {"field": "costCode.description", "label": "Description", "dataType": "STRING"},
      {"field": "budgetedCost", "label": "Budgeted Cost", "dataType": "CURRENCY"},
      {"field": "actualCost", "label": "Actual Cost", "dataType": "CURRENCY"},
      {"field": "variance", "label": "Variance", "dataType": "CURRENCY"},
      {"field": "variancePercent", "label": "Variance %", "dataType": "PERCENT"}
    ],
    "filters": [
      {"field": "variancePercent", "operator": "GREATER_THAN", "value": 10}
    ],
    "joins": [
      {"entity": "costCode", "type": "LEFT", "alias": "costCode"}
    ],
    "sorting": [
      {"field": "variancePercent", "direction": "DESC"}
    ]
  }'::jsonb,
  true
);
*/

-- =============================================================================
-- ROLLBACK SCRIPT (for reference)
-- =============================================================================

/*
-- To rollback this migration:
DROP TRIGGER IF EXISTS update_report_executions_updated_at ON report_executions;
DROP TRIGGER IF EXISTS update_custom_reports_updated_at ON custom_reports;
DROP TABLE IF EXISTS report_executions CASCADE;
DROP TABLE IF EXISTS custom_reports CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

/*
-- Verify table creation
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('custom_reports', 'report_executions');

-- Check indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('custom_reports', 'report_executions')
ORDER BY tablename, indexname;

-- Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN (
  'custom_reports'::regclass,
  'report_executions'::regclass
)
ORDER BY conname;
*/
