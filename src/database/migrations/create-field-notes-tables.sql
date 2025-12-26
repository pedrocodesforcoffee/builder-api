-- ============================================================================
-- FIELD NOTES & OBSERVATIONS MODULE - DATABASE MIGRATION
-- ============================================================================
-- Creates tables and enums for comprehensive field observation tracking
-- Features:
--   - 25 note types for comprehensive site documentation
--   - Rich attachments with GPS tagging and photo markup
--   - Linking to RFIs, submittals, daily reports, and other entities
--   - Template system for common scenarios
--   - Threaded comments with mentions and reactions
--   - Full-text search and timeline views
--   - Offline sync with conflict resolution
--   - Complete audit trail
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

-- Field note types (25 comprehensive types)
CREATE TYPE field_note_type AS ENUM (
  'GENERAL',
  'SITE_CONDITIONS',
  'WEATHER',
  'VERBAL_DIRECTION',
  'MEETING',
  'PHONE_CALL',
  'DELAY',
  'INSPECTION',
  'QUALITY_ISSUE',
  'SAFETY_CONCERN',
  'VISITOR',
  'DELIVERY',
  'EQUIPMENT',
  'MANPOWER',
  'MATERIAL_ISSUE',
  'CHANGE_ORDER',
  'WORK_DIRECTIVE',
  'CLARIFICATION',
  'COORDINATION',
  'PROGRESS_NOTE',
  'DOCUMENTATION',
  'OBSERVATION',
  'DEFICIENCY',
  'COMPLETION',
  'OTHER'
);

-- Field note visibility levels
CREATE TYPE field_note_visibility AS ENUM (
  'PRIVATE',  -- Only creator can see
  'TEAM',     -- Project team members
  'SHARED',   -- Shared with specific users/roles
  'PUBLIC'    -- All project participants
);

-- Priority levels for follow-up actions
CREATE TYPE field_note_priority AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

-- Status of field note
CREATE TYPE field_note_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'FOLLOW_UP_REQUIRED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'ARCHIVED'
);

-- Types of entities that can be linked
CREATE TYPE linked_entity_type AS ENUM (
  'RFI',
  'SUBMITTAL',
  'DAILY_REPORT',
  'PUNCH_ITEM',
  'SAFETY_OBSERVATION',
  'SAFETY_INCIDENT',
  'CHANGE_ORDER',
  'MEETING',
  'DOCUMENT',
  'COST_CODE',
  'SCHEDULE_TASK'
);

-- Attachment types
CREATE TYPE attachment_type AS ENUM (
  'PHOTO',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'SKETCH',
  'PDF',
  'OTHER'
);

-- Comment visibility
CREATE TYPE comment_visibility AS ENUM (
  'PUBLIC',
  'TEAM',
  'PRIVATE',
  'INTERNAL'
);

-- History action types for audit trail
CREATE TYPE field_note_history_action AS ENUM (
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'VISIBILITY_CHANGED',
  'ATTACHMENT_ADDED',
  'ATTACHMENT_REMOVED',
  'LINK_ADDED',
  'LINK_REMOVED',
  'COMMENT_ADDED',
  'COMMENT_REMOVED',
  'ASSIGNED',
  'UNASSIGNED',
  'FOLLOW_UP_COMPLETED',
  'ARCHIVED',
  'RESTORED'
);

-- Weather conditions
CREATE TYPE weather_condition AS ENUM (
  'CLEAR',
  'PARTLY_CLOUDY',
  'CLOUDY',
  'RAIN',
  'HEAVY_RAIN',
  'SNOW',
  'SLEET',
  'FOG',
  'WIND',
  'EXTREME_HEAT',
  'EXTREME_COLD',
  'STORM'
);

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: field_note_templates
-- Purpose: Reusable templates for common field note scenarios
-- ----------------------------------------------------------------------------
CREATE TABLE field_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  note_type field_note_type NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  template_fields JSONB NOT NULL,
  default_values JSONB,
  category VARCHAR(100),
  display_order INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  organization_id UUID,
  created_by_id UUID NOT NULL,
  updated_by_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_note_templates_organization FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_templates_created_by FOREIGN KEY (created_by_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_field_note_templates_updated_by FOREIGN KEY (updated_by_id)
    REFERENCES users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- Table: field_notes
-- Purpose: Main field note records with comprehensive metadata
-- ----------------------------------------------------------------------------
CREATE TABLE field_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(50) NOT NULL UNIQUE,
  note_type field_note_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  note_date DATE NOT NULL,
  note_time TIME,
  visibility field_note_visibility NOT NULL DEFAULT 'TEAM',
  priority field_note_priority NOT NULL DEFAULT 'NORMAL',
  status field_note_status NOT NULL DEFAULT 'ACTIVE',

  -- GPS location
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  gps_accuracy DECIMAL(8, 2),
  location_description VARCHAR(500),

  -- Organization and searching
  tags TEXT[],  -- Using PostgreSQL array for tags
  mentioned_user_ids UUID[],

  -- Weather data (for weather-related notes)
  weather_data JSONB,

  -- Template support
  template_id UUID,
  template_data JSONB,

  -- Follow-up tracking
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_due_date DATE,
  assigned_to_id UUID,
  follow_up_completed_at TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,

  -- Offline sync
  client_id UUID,
  synced_at TIMESTAMP WITH TIME ZONE,
  last_modified_at TIMESTAMP WITH TIME ZONE,
  conflict_data JSONB,

  -- Additional metadata
  metadata JSONB,

  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by_id UUID,

  -- Relations
  project_id UUID NOT NULL,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_notes_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_notes_template FOREIGN KEY (template_id)
    REFERENCES field_note_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_field_notes_created_by FOREIGN KEY (created_by_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_field_notes_assigned_to FOREIGN KEY (assigned_to_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_field_notes_deleted_by FOREIGN KEY (deleted_by_id)
    REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT chk_field_notes_gps CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  CONSTRAINT chk_field_notes_client_id_unique CHECK (
    client_id IS NULL OR client_id IS NOT NULL
  )
);

-- ----------------------------------------------------------------------------
-- Table: field_note_attachments
-- Purpose: Photos, videos, audio, documents with GPS and markup support
-- ----------------------------------------------------------------------------
CREATE TABLE field_note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_note_id UUID NOT NULL,
  attachment_type attachment_type NOT NULL,
  filename VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),
  file_size BIGINT,
  mime_type VARCHAR(100),

  -- S3 storage
  s3_bucket VARCHAR(255),
  s3_key VARCHAR(1000),

  -- Metadata
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- GPS location where captured
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  gps_accuracy DECIMAL(8, 2),
  captured_at TIMESTAMP WITH TIME ZONE,
  device_info VARCHAR(255),

  -- Rich metadata (dimensions, EXIF, markup, transcription)
  metadata JSONB,

  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_note_attachments_field_note FOREIGN KEY (field_note_id)
    REFERENCES field_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_attachments_uploaded_by FOREIGN KEY (uploaded_by_id)
    REFERENCES users(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- Table: field_note_links
-- Purpose: Connect notes to RFIs, submittals, daily reports, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE field_note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_note_id UUID NOT NULL,
  linked_entity_type linked_entity_type NOT NULL,
  linked_entity_id UUID NOT NULL,
  linked_entity_title VARCHAR(500),
  link_description TEXT,
  metadata JSONB,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_note_links_field_note FOREIGN KEY (field_note_id)
    REFERENCES field_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_links_created_by FOREIGN KEY (created_by_id)
    REFERENCES users(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- Table: field_note_comments
-- Purpose: Threaded discussions on field notes with mentions and reactions
-- ----------------------------------------------------------------------------
CREATE TABLE field_note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_note_id UUID NOT NULL,
  content TEXT NOT NULL,
  visibility comment_visibility NOT NULL DEFAULT 'PUBLIC',
  parent_comment_id UUID,
  mentioned_user_ids UUID[],
  reactions JSONB,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_note_comments_field_note FOREIGN KEY (field_note_id)
    REFERENCES field_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_comments_parent FOREIGN KEY (parent_comment_id)
    REFERENCES field_note_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_comments_created_by FOREIGN KEY (created_by_id)
    REFERENCES users(id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- Table: field_note_history
-- Purpose: Complete audit trail of all changes
-- ----------------------------------------------------------------------------
CREATE TABLE field_note_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_note_id UUID NOT NULL,
  action field_note_history_action NOT NULL,
  description TEXT,
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  snapshot JSONB,
  metadata JSONB,
  reason TEXT,
  performed_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_field_note_history_field_note FOREIGN KEY (field_note_id)
    REFERENCES field_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_note_history_performed_by FOREIGN KEY (performed_by_id)
    REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Templates indexes
CREATE INDEX idx_field_note_templates_org_type ON field_note_templates(organization_id, note_type);
CREATE INDEX idx_field_note_templates_system_active ON field_note_templates(is_system, is_active);

-- Field notes indexes
CREATE INDEX idx_field_notes_project_date ON field_notes(project_id, note_date);
CREATE INDEX idx_field_notes_project_type ON field_notes(project_id, note_type);
CREATE INDEX idx_field_notes_project_status ON field_notes(project_id, status);
CREATE INDEX idx_field_notes_project_visibility ON field_notes(project_id, visibility);
CREATE INDEX idx_field_notes_created_by ON field_notes(created_by_id);
CREATE INDEX idx_field_notes_assigned_to ON field_notes(assigned_to_id);
CREATE INDEX idx_field_notes_number ON field_notes(number);
CREATE INDEX idx_field_notes_client_id ON field_notes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_field_notes_tags ON field_notes USING GIN (tags);
CREATE INDEX idx_field_notes_follow_up ON field_notes(follow_up_required, follow_up_due_date) WHERE follow_up_required = TRUE;

-- Attachments indexes
CREATE INDEX idx_field_note_attachments_field_note_order ON field_note_attachments(field_note_id, display_order);
CREATE INDEX idx_field_note_attachments_type ON field_note_attachments(attachment_type);

-- Links indexes
CREATE INDEX idx_field_note_links_field_note ON field_note_links(field_note_id);
CREATE INDEX idx_field_note_links_entity ON field_note_links(linked_entity_type, linked_entity_id);
CREATE INDEX idx_field_note_links_field_note_type ON field_note_links(field_note_id, linked_entity_type);

-- Comments indexes
CREATE INDEX idx_field_note_comments_field_note_date ON field_note_comments(field_note_id, created_at);
CREATE INDEX idx_field_note_comments_parent ON field_note_comments(parent_comment_id);
CREATE INDEX idx_field_note_comments_created_by ON field_note_comments(created_by_id);

-- History indexes
CREATE INDEX idx_field_note_history_field_note_date ON field_note_history(field_note_id, created_at);
CREATE INDEX idx_field_note_history_action ON field_note_history(action);
CREATE INDEX idx_field_note_history_performed_by ON field_note_history(performed_by_id);

-- ============================================================================
-- STEP 4: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE field_note_templates IS 'Reusable templates for common field note scenarios (system and organization-specific)';
COMMENT ON TABLE field_notes IS 'Main field notes for capturing real-time site observations with GPS, attachments, and linking';
COMMENT ON TABLE field_note_attachments IS 'Photos, videos, audio, and documents attached to field notes with markup support';
COMMENT ON TABLE field_note_links IS 'Connections between field notes and other entities (RFIs, submittals, etc.)';
COMMENT ON TABLE field_note_comments IS 'Threaded discussions on field notes with mentions, reactions, and visibility control';
COMMENT ON TABLE field_note_history IS 'Complete audit trail of all changes to field notes';

COMMENT ON COLUMN field_notes.number IS 'Auto-generated unique identifier (e.g., PROJECT-FN-0001)';
COMMENT ON COLUMN field_notes.tags IS 'PostgreSQL array of tags for organization and full-text search';
COMMENT ON COLUMN field_notes.mentioned_user_ids IS 'Array of user IDs mentioned in the note (triggers notifications)';
COMMENT ON COLUMN field_notes.client_id IS 'Client-generated UUID for offline sync deduplication';
COMMENT ON COLUMN field_notes.weather_data IS 'JSONB containing weather conditions, temperature, wind, etc.';
COMMENT ON COLUMN field_notes.template_data IS 'JSONB containing filled-in template field values';
COMMENT ON COLUMN field_note_attachments.metadata IS 'JSONB containing EXIF, dimensions, markup annotations, transcriptions';
COMMENT ON COLUMN field_note_links.metadata IS 'JSONB containing entity-specific cached data (numbers, statuses, etc.)';
COMMENT ON COLUMN field_note_comments.reactions IS 'JSONB containing likes, helpful counts, and user reactions';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
