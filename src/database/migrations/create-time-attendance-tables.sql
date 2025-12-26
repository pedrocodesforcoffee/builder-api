-- ============================================================================
-- TIME & ATTENDANCE MODULE - DATABASE MIGRATION
-- ============================================================================
-- Creates tables and enums for comprehensive time tracking and payroll system
-- Features:
--   - GPS-based clock in/out with geofencing
--   - Multiple overtime calculation engines
--   - Break and lunch tracking
--   - Cost code allocation
--   - Approval workflows
--   - Crew timesheet bulk entry
--   - Payroll export capabilities
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

-- Time entry status workflow
CREATE TYPE time_entry_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'LOCKED'
);

-- Clock methods for tracking how time was recorded
CREATE TYPE clock_method AS ENUM (
  'MOBILE_APP',
  'KIOSK',
  'WEB',
  'MANUAL',
  'QR_CODE',
  'NFC',
  'BIOMETRIC'
);

-- Employment types
CREATE TYPE employment_type AS ENUM (
  'DIRECT_EMPLOYEE',
  'SUBCONTRACTOR',
  'UNION',
  'NON_UNION',
  'TEMPORARY',
  'APPRENTICE'
);

-- Overtime calculation rules
CREATE TYPE overtime_rule AS ENUM (
  'STANDARD',        -- >40 hours weekly = 1.5x OT
  'CALIFORNIA',      -- >8 daily = 1.5x OT, >12 daily = 2.0x DT
  'UNION',           -- Custom union rules
  'CONSTRUCTION',    -- Construction-specific rules
  'STATE_SPECIFIC',  -- Other state-specific rules
  'CUSTOM'           -- Fully custom configuration
);

-- Clock event types
CREATE TYPE event_type AS ENUM (
  'CLOCK_IN',
  'CLOCK_OUT',
  'BREAK_START',
  'BREAK_END',
  'LUNCH_START',
  'LUNCH_END'
);

-- Geofence types
CREATE TYPE geofence_type AS ENUM (
  'CIRCULAR',
  'POLYGON'
);

-- Crew timesheet status
CREATE TYPE crew_timesheet_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED'
);

-- Payroll export formats
CREATE TYPE payroll_export_format AS ENUM (
  'CSV',
  'JSON',
  'XML',
  'QUICKBOOKS',
  'ADP'
);

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: project_geofences
-- Purpose: Store GPS geofence boundaries for construction sites
-- ----------------------------------------------------------------------------
CREATE TABLE project_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type geofence_type NOT NULL,

  -- For CIRCULAR geofences
  center_latitude DECIMAL(10, 7),
  center_longitude DECIMAL(10, 7),
  radius_meters DECIMAL(10, 2),

  -- For POLYGON geofences (stored as array of [lng, lat] coordinates)
  polygon_coordinates JSONB,

  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_circular_geofence CHECK (
    (type = 'CIRCULAR' AND center_latitude IS NOT NULL AND center_longitude IS NOT NULL AND radius_meters IS NOT NULL)
    OR type != 'CIRCULAR'
  ),
  CONSTRAINT chk_polygon_geofence CHECK (
    (type = 'POLYGON' AND polygon_coordinates IS NOT NULL)
    OR type != 'POLYGON'
  ),
  CONSTRAINT chk_radius_positive CHECK (radius_meters IS NULL OR radius_meters > 0)
);

-- Indexes for project_geofences
CREATE INDEX idx_project_geofences_project_id ON project_geofences(project_id);
CREATE INDEX idx_project_geofences_is_active ON project_geofences(is_active);
CREATE INDEX idx_project_geofences_project_active ON project_geofences(project_id, is_active);

-- ----------------------------------------------------------------------------
-- Table: worker_profiles
-- Purpose: Link users to employment information, rates, and overtime rules
-- ----------------------------------------------------------------------------
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Employment information
  employment_type employment_type NOT NULL DEFAULT 'DIRECT_EMPLOYEE',
  trade VARCHAR(255),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Pay information
  hourly_rate DECIMAL(10, 2) NOT NULL,
  overtime_rule overtime_rule NOT NULL DEFAULT 'STANDARD',
  overtime_config JSONB, -- Custom overtime configuration

  -- Prevailing wage support (for government projects)
  prevailing_wage_rate DECIMAL(10, 2),
  fringe_benefits_rate DECIMAL(10, 2),

  -- Union information
  is_union BOOLEAN DEFAULT false,
  union_local_number VARCHAR(100),
  union_name VARCHAR(255),

  -- Certifications and licenses
  certifications JSONB, -- Array of certification objects

  -- Audit fields
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_hourly_rate_positive CHECK (hourly_rate > 0),
  CONSTRAINT chk_prevailing_wage CHECK (prevailing_wage_rate IS NULL OR prevailing_wage_rate >= hourly_rate),
  CONSTRAINT chk_termination_after_hire CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

-- Indexes for worker_profiles
CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_organization_id ON worker_profiles(organization_id);
CREATE INDEX idx_worker_profiles_project_id ON worker_profiles(project_id);
CREATE INDEX idx_worker_profiles_is_active ON worker_profiles(is_active);
CREATE INDEX idx_worker_profiles_trade ON worker_profiles(trade);
CREATE INDEX idx_worker_profiles_employment_type ON worker_profiles(employment_type);
CREATE INDEX idx_worker_profiles_user_org ON worker_profiles(user_id, organization_id);

-- ----------------------------------------------------------------------------
-- Table: time_entries
-- Purpose: Core daily time tracking record per worker per project
-- ----------------------------------------------------------------------------
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,

  -- Time tracking
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  lunch_minutes INTEGER DEFAULT 30,

  -- Calculated hours
  total_hours_worked DECIMAL(6, 2) DEFAULT 0,
  regular_hours DECIMAL(6, 2) DEFAULT 0,
  overtime_hours DECIMAL(6, 2) DEFAULT 0,
  double_time_hours DECIMAL(6, 2) DEFAULT 0,

  -- Workflow status
  status time_entry_status DEFAULT 'DRAFT',

  -- Submission tracking
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by_id UUID REFERENCES users(id),

  -- Approval tracking
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_id UUID REFERENCES users(id),
  approval_notes TEXT,

  -- Rejection tracking
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by_id UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Payroll lock
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by_id UUID REFERENCES users(id),
  payroll_exported_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Crew timesheet linkage (if created from crew timesheet)
  crew_timesheet_id UUID REFERENCES crew_timesheets(id) ON DELETE SET NULL,

  -- Audit fields
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT uq_time_entry_worker_project_date UNIQUE (worker_id, project_id, entry_date),
  CONSTRAINT chk_clock_out_after_clock_in CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time),
  CONSTRAINT chk_hours_non_negative CHECK (
    total_hours_worked >= 0 AND
    regular_hours >= 0 AND
    overtime_hours >= 0 AND
    double_time_hours >= 0
  ),
  CONSTRAINT chk_break_minutes_non_negative CHECK (break_minutes >= 0),
  CONSTRAINT chk_lunch_minutes_non_negative CHECK (lunch_minutes >= 0)
);

-- Indexes for time_entries
CREATE INDEX idx_time_entries_worker_id ON time_entries(worker_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_is_locked ON time_entries(is_locked);
CREATE INDEX idx_time_entries_worker_date ON time_entries(worker_id, entry_date);
CREATE INDEX idx_time_entries_project_date ON time_entries(project_id, entry_date);
CREATE INDEX idx_time_entries_project_status ON time_entries(project_id, status);
CREATE INDEX idx_time_entries_crew_timesheet ON time_entries(crew_timesheet_id);

-- ----------------------------------------------------------------------------
-- Table: clock_events
-- Purpose: Store timestamped GPS-tracked clock events
-- ----------------------------------------------------------------------------
CREATE TABLE clock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- GPS tracking
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  accuracy DECIMAL(10, 2), -- GPS accuracy in meters

  -- Geofence validation
  geofence_validated BOOLEAN DEFAULT false,
  distance_from_geofence DECIMAL(10, 2), -- Distance in meters (0 if inside)
  geofence_id UUID REFERENCES project_geofences(id) ON DELETE SET NULL,

  -- Clock method
  clock_method clock_method DEFAULT 'MOBILE_APP',

  -- Device information (stored as JSONB)
  device_info JSONB, -- { deviceType, osVersion, appVersion, deviceId, etc. }

  -- IP address for audit trail
  ip_address VARCHAR(45),

  -- Notes
  notes TEXT,

  -- Audit fields
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_accuracy_positive CHECK (accuracy IS NULL OR accuracy >= 0),
  CONSTRAINT chk_distance_non_negative CHECK (distance_from_geofence IS NULL OR distance_from_geofence >= 0)
);

-- Indexes for clock_events
CREATE INDEX idx_clock_events_time_entry_id ON clock_events(time_entry_id);
CREATE INDEX idx_clock_events_event_type ON clock_events(event_type);
CREATE INDEX idx_clock_events_event_time ON clock_events(event_time);
CREATE INDEX idx_clock_events_time_entry_type ON clock_events(time_entry_id, event_type);

-- ----------------------------------------------------------------------------
-- Table: time_entry_cost_allocations
-- Purpose: Allocate time entry hours to cost codes
-- ----------------------------------------------------------------------------
CREATE TABLE time_entry_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,

  -- Allocation methods (use one or the other)
  hours_allocated DECIMAL(6, 2),
  percentage_allocated DECIMAL(5, 2), -- 0-100

  -- Description
  description TEXT,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_hours_or_percentage CHECK (
    (hours_allocated IS NOT NULL AND percentage_allocated IS NULL) OR
    (hours_allocated IS NULL AND percentage_allocated IS NOT NULL)
  ),
  CONSTRAINT chk_hours_positive CHECK (hours_allocated IS NULL OR hours_allocated > 0),
  CONSTRAINT chk_percentage_range CHECK (percentage_allocated IS NULL OR (percentage_allocated >= 0 AND percentage_allocated <= 100))
);

-- Indexes for time_entry_cost_allocations
CREATE INDEX idx_cost_allocations_time_entry_id ON time_entry_cost_allocations(time_entry_id);
CREATE INDEX idx_cost_allocations_cost_code_id ON time_entry_cost_allocations(cost_code_id);

-- ----------------------------------------------------------------------------
-- Table: crew_timesheets
-- Purpose: Bulk time entry for entire crew by foreman
-- ----------------------------------------------------------------------------
CREATE TABLE crew_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  foreman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timesheet_date DATE NOT NULL,

  -- Worker IDs (stored as JSONB array)
  worker_ids JSONB NOT NULL, -- Array of worker profile UUIDs

  -- Default values for crew
  default_clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  default_clock_out_time TIMESTAMP WITH TIME ZONE NOT NULL,
  default_break_minutes INTEGER DEFAULT 0,
  default_lunch_minutes INTEGER DEFAULT 30,

  -- Workflow status
  status crew_timesheet_status DEFAULT 'DRAFT',

  -- Notes
  notes TEXT,

  -- Submission tracking
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by_id UUID REFERENCES users(id),

  -- Approval tracking
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_id UUID REFERENCES users(id),
  approval_notes TEXT,

  -- Rejection tracking
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by_id UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Audit fields
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_crew_clock_out_after_in CHECK (default_clock_out_time > default_clock_in_time),
  CONSTRAINT chk_crew_break_minutes_non_negative CHECK (default_break_minutes >= 0),
  CONSTRAINT chk_crew_lunch_minutes_non_negative CHECK (default_lunch_minutes >= 0)
);

-- Indexes for crew_timesheets
CREATE INDEX idx_crew_timesheets_project_id ON crew_timesheets(project_id);
CREATE INDEX idx_crew_timesheets_foreman_id ON crew_timesheets(foreman_id);
CREATE INDEX idx_crew_timesheets_timesheet_date ON crew_timesheets(timesheet_date);
CREATE INDEX idx_crew_timesheets_status ON crew_timesheets(status);
CREATE INDEX idx_crew_timesheets_project_date ON crew_timesheets(project_id, timesheet_date);

-- ============================================================================
-- STEP 3: ADD FOREIGN KEY FOR CREW_TIMESHEET_ID IN TIME_ENTRIES
-- Note: This FK was forward-referenced in time_entries table creation
-- ============================================================================
-- Already included in time_entries table definition above

-- ============================================================================
-- STEP 4: CREATE UPDATE TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_project_geofences_updated_at BEFORE UPDATE ON project_geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_profiles_updated_at BEFORE UPDATE ON worker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entry_cost_allocations_updated_at BEFORE UPDATE ON time_entry_cost_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_timesheets_updated_at BEFORE UPDATE ON crew_timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE project_geofences IS 'GPS geofence boundaries for construction sites';
COMMENT ON TABLE worker_profiles IS 'Worker employment information, rates, and overtime rules';
COMMENT ON TABLE time_entries IS 'Daily time tracking records per worker per project';
COMMENT ON TABLE clock_events IS 'Timestamped GPS-tracked clock events (in/out, breaks, lunch)';
COMMENT ON TABLE time_entry_cost_allocations IS 'Allocation of time entry hours to cost codes';
COMMENT ON TABLE crew_timesheets IS 'Bulk time entry for entire crews';

COMMENT ON COLUMN project_geofences.polygon_coordinates IS 'Array of [longitude, latitude] coordinates defining polygon boundary';
COMMENT ON COLUMN worker_profiles.overtime_config IS 'Custom overtime configuration (dailyOTHours, weeklyOTHours, otMultiplier, dtMultiplier, etc.)';
COMMENT ON COLUMN worker_profiles.certifications IS 'Array of certification objects with name, number, expiry date, etc.';
COMMENT ON COLUMN time_entries.crew_timesheet_id IS 'Links to crew timesheet if this entry was generated from bulk entry';
COMMENT ON COLUMN clock_events.device_info IS 'Device information (deviceType, osVersion, appVersion, deviceId, etc.)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 6
-- Enums created: 8
-- Indexes created: 33
-- Triggers created: 5
-- ============================================================================
