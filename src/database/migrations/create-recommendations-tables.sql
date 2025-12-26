-- ============================================================================
-- AI Recommendations & Cross-Project Learning Migration
-- Task 3.8.1.3: AI-Powered Recommendations & Cross-Project Learning
--
-- This migration creates 5 new tables:
-- 1. project_profiles - Aggregated project metadata for similarity matching
-- 2. recommendations - AI-generated recommendations for projects
-- 3. lessons_learned - Lessons learned from completed projects
-- 4. project_patterns - Calculated patterns and trends across projects
-- 5. subcontractor_performance - Aggregated subcontractor performance metrics
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROJECT_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Project Metadata
  "projectType" VARCHAR(100) NOT NULL,
  "buildingType" VARCHAR(100),
  "deliveryMethod" VARCHAR(100),
  "contractValue" DECIMAL(14,2),
  "squareFootage" INTEGER,
  "durationDays" INTEGER,
  location VARCHAR(100),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),

  -- Project Scope
  "scopeElements" TEXT[] DEFAULT '{}',
  "specialtyTrades" TEXT[] DEFAULT '{}',

  -- Completion Data
  "isComplete" BOOLEAN DEFAULT FALSE,
  "completionDate" TIMESTAMP,
  "finalCost" DECIMAL(14,2),
  "costVariancePercent" DECIMAL(5,2),
  "scheduleVarianceDays" INTEGER,
  "rfiCount" INTEGER,
  "changeOrderCount" INTEGER,
  "changeOrderValue" DECIMAL(14,2),
  "safetyIncidentCount" INTEGER,
  "qualityIssueCount" INTEGER,

  -- Embedding for Similarity Matching
  embedding JSONB,
  "embeddingGeneratedAt" TIMESTAMP,

  -- Performance Metrics
  "clientSatisfactionScore" DECIMAL(5,2),
  "profitMarginPercent" DECIMAL(5,2),

  -- Metadata
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for project_profiles
CREATE INDEX idx_project_profiles_org_id ON project_profiles("organizationId");
CREATE INDEX idx_project_profiles_org_complete ON project_profiles("organizationId", "isComplete");
CREATE INDEX idx_project_profiles_type ON project_profiles("projectType", "buildingType");
CREATE INDEX idx_project_profiles_complete ON project_profiles("isComplete");

-- ============================================================================
-- 2. RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TYPE recommendation_type AS ENUM (
  'SIMILAR_PROJECT', 'SUBCONTRACTOR_SUGGESTION', 'COST_CODE_SUGGESTION',
  'SPECIFICATION_SECTION', 'DOCUMENT_SUGGESTION', 'LESSON_LEARNED',
  'BUDGET_RISK', 'SCHEDULE_RISK', 'QUALITY_CONCERN', 'SAFETY_ALERT',
  'COST_OPTIMIZATION', 'PROCESS_IMPROVEMENT', 'VENDOR_PERFORMANCE',
  'RESOURCE_ALLOCATION', 'BUDGET_ESTIMATE', 'DURATION_ESTIMATE', 'MANPOWER_ESTIMATE'
);

CREATE TYPE recommendation_status AS ENUM (
  'PENDING', 'ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'
);

CREATE TYPE recommendation_priority AS ENUM (
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Recommendation Type & Status
  type recommendation_type NOT NULL,
  status recommendation_status DEFAULT 'PENDING',
  priority recommendation_priority DEFAULT 'MEDIUM',

  -- Recommendation Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  "actionSuggestion" TEXT,

  -- Supporting Data
  "recommendationData" JSONB,
  "supportingProjects" TEXT[] DEFAULT '{}',
  "confidenceScore" DECIMAL(3,2),

  -- Context
  "contextType" VARCHAR(100),
  "contextEntityId" UUID,
  "contextEntityType" VARCHAR(100),

  -- User Interaction
  "presentedToUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "presentedAt" TIMESTAMP,
  "actionTakenByUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "actionTakenAt" TIMESTAMP,
  "userFeedback" TEXT,
  "userRating" INTEGER,

  -- Lifecycle
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for recommendations
CREATE INDEX idx_recommendations_project_id ON recommendations("projectId");
CREATE INDEX idx_recommendations_org_id ON recommendations("organizationId");
CREATE INDEX idx_recommendations_project_status_priority ON recommendations("projectId", status, priority);
CREATE INDEX idx_recommendations_org_type_status ON recommendations("organizationId", type, status);
CREATE INDEX idx_recommendations_created_at ON recommendations("createdAt");

-- ============================================================================
-- 3. LESSONS_LEARNED TABLE
-- ============================================================================

CREATE TYPE lesson_learned_category AS ENUM (
  'BUDGET_MANAGEMENT', 'SCHEDULE_MANAGEMENT', 'QUALITY_CONTROL', 'SAFETY',
  'SUBCONTRACTOR_MANAGEMENT', 'MATERIAL_PROCUREMENT', 'DESIGN_COORDINATION',
  'SITE_CONDITIONS', 'REGULATORY_COMPLIANCE', 'COMMUNICATION', 'RISK_MANAGEMENT',
  'TECHNOLOGY', 'LABOR_MANAGEMENT', 'CHANGE_MANAGEMENT', 'CLIENT_RELATIONS', 'OTHER'
);

CREATE TABLE IF NOT EXISTS lessons_learned (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Categorization
  category lesson_learned_category NOT NULL,
  tags TEXT[] DEFAULT '{}',

  -- Content (Structured Format)
  title VARCHAR(255) NOT NULL,
  situation TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  lesson TEXT NOT NULL,
  "recommendedAction" TEXT,

  -- Impact Metrics
  "impactType" VARCHAR(50),
  "costImpact" DECIMAL(14,2),
  "scheduleImpact" INTEGER,

  -- Embedding for Similarity Matching
  embedding JSONB,
  "embeddingGeneratedAt" TIMESTAMP,

  -- Usage Tracking
  "timesReferenced" INTEGER DEFAULT 0,
  "timesApplied" INTEGER DEFAULT 0,
  "effectivenessScore" DECIMAL(3,2),

  -- Source
  "aiGenerated" BOOLEAN DEFAULT FALSE,
  "createdByUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "approvedByUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "isApproved" BOOLEAN DEFAULT FALSE,
  "approvedAt" TIMESTAMP,

  -- Visibility
  "isActive" BOOLEAN DEFAULT TRUE,
  "isPublic" BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for lessons_learned
CREATE INDEX idx_lessons_learned_org_id ON lessons_learned("organizationId");
CREATE INDEX idx_lessons_learned_project_id ON lessons_learned("projectId");
CREATE INDEX idx_lessons_learned_org_category_approved ON lessons_learned("organizationId", category, "isApproved");
CREATE INDEX idx_lessons_learned_approved ON lessons_learned("isApproved");

-- ============================================================================
-- 4. PROJECT_PATTERNS TABLE
-- ============================================================================

CREATE TYPE pattern_type AS ENUM (
  'COST_VARIANCE', 'SCHEDULE_VARIANCE', 'SUBCONTRACTOR_PERFORMANCE',
  'RFI_VELOCITY', 'CHANGE_ORDER_FREQUENCY', 'SAFETY_INCIDENTS',
  'QUALITY_ISSUES', 'MATERIAL_DELAYS', 'LABOR_PRODUCTIVITY',
  'WEATHER_IMPACT', 'PERMIT_DELAYS', 'DESIGN_CHANGES',
  'CASH_FLOW', 'PUNCH_LIST'
);

CREATE TABLE IF NOT EXISTS project_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Pattern Type & Scope
  "patternType" pattern_type NOT NULL,
  "patternSubtype" VARCHAR(100),
  "patternName" VARCHAR(255) NOT NULL,
  "patternDescription" TEXT NOT NULL,

  -- Statistical Data
  "sampleSize" INTEGER NOT NULL,
  "averageValue" DECIMAL(10,2),
  "medianValue" DECIMAL(10,2),
  "standardDeviation" DECIMAL(10,2),
  "percentile25" DECIMAL(10,2),
  "percentile75" DECIMAL(10,2),
  "confidenceScore" DECIMAL(3,2) NOT NULL,

  -- Trend Analysis
  "trendDirection" VARCHAR(50),
  "trendSlopePercent" DECIMAL(5,2),

  -- Conditions & Filters
  "conditionsApplied" JSONB,
  "applicableProjectTypes" TEXT[] DEFAULT '{}',
  "applicableBuildingTypes" TEXT[] DEFAULT '{}',

  -- Impact Assessment
  "impactSeverity" VARCHAR(50),
  "averageCostImpact" DECIMAL(14,2),
  "averageScheduleImpact" INTEGER,

  -- Recommendations
  "recommendedMitigation" TEXT,
  "relatedLessonsLearned" JSONB,

  -- Supporting Data
  "supportingProjects" TEXT[] DEFAULT '{}',
  "detailedAnalysis" JSONB,

  -- Calculation Metadata
  "calculatedAt" TIMESTAMP NOT NULL,
  "validUntil" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for project_patterns
CREATE INDEX idx_project_patterns_org_id ON project_patterns("organizationId");
CREATE INDEX idx_project_patterns_org_type_active ON project_patterns("organizationId", "patternType", "isActive");
CREATE INDEX idx_project_patterns_calculated_at ON project_patterns("calculatedAt");

-- ============================================================================
-- 5. SUBCONTRACTOR_PERFORMANCE TABLE
-- ============================================================================

CREATE TYPE performance_rating AS ENUM (
  'EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'POOR', 'NOT_RATED'
);

CREATE TABLE IF NOT EXISTS subcontractor_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Subcontractor Identification
  "subcontractorName" VARCHAR(255) NOT NULL,
  trades TEXT[] DEFAULT '{}',
  "contactEmail" VARCHAR(255),
  "contactPhone" VARCHAR(50),

  -- Performance Metrics
  "projectCount" INTEGER DEFAULT 0,
  "totalContractValue" DECIMAL(14,2),
  "averageContractValue" DECIMAL(14,2),

  -- Quality Metrics
  "overallRating" performance_rating DEFAULT 'NOT_RATED',
  "qualityScore" DECIMAL(5,2),
  "qualityIssueCount" INTEGER DEFAULT 0,
  "defectRate" DECIMAL(5,2),

  -- Schedule Performance
  "onTimeCompletionRate" DECIMAL(5,2),
  "averageScheduleVarianceDays" INTEGER,
  "lateCompletionCount" INTEGER DEFAULT 0,

  -- Cost Performance
  "budgetAdherenceRate" DECIMAL(5,2),
  "averageCostVariancePercent" DECIMAL(5,2),
  "changeOrderCount" INTEGER DEFAULT 0,
  "changeOrderValue" DECIMAL(14,2),

  -- Safety Metrics
  "safetyIncidentCount" INTEGER DEFAULT 0,
  "incidentRate" DECIMAL(10,2),
  "safetyCompliant" BOOLEAN DEFAULT TRUE,

  -- Communication & Responsiveness
  "responsivenessScore" DECIMAL(5,2),
  "averageRfiResponseHours" DECIMAL(10,2),
  "communicationIssueCount" INTEGER DEFAULT 0,

  -- Reliability Metrics
  "contractCompletionCount" INTEGER DEFAULT 0,
  "contractTerminationCount" INTEGER DEFAULT 0,
  "reliabilityScore" DECIMAL(5,2),

  -- Certifications & Insurance
  "insuranceCurrent" BOOLEAN DEFAULT FALSE,
  "licenseCurrent" BOOLEAN DEFAULT FALSE,
  certifications TEXT[] DEFAULT '{}',

  -- Recommendation Status
  "wouldRecommend" BOOLEAN DEFAULT TRUE,
  "recommendationLevel" VARCHAR(50),
  notes TEXT,

  -- Project References
  "projectIds" TEXT[] DEFAULT '{}',
  "lastWorkedDate" TIMESTAMP,
  "lastEvaluationDate" TIMESTAMP,

  -- Metadata
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for subcontractor_performance
CREATE INDEX idx_subcontractor_perf_org_id ON subcontractor_performance("organizationId");
CREATE INDEX idx_subcontractor_perf_org_name ON subcontractor_performance("organizationId", "subcontractorName");
CREATE INDEX idx_subcontractor_perf_rating_count ON subcontractor_performance("overallRating", "projectCount");

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_project_profiles_updated_at
  BEFORE UPDATE ON project_profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_lessons_learned_updated_at
  BEFORE UPDATE ON lessons_learned
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_patterns_updated_at
  BEFORE UPDATE ON project_patterns
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_subcontractor_performance_updated_at
  BEFORE UPDATE ON subcontractor_performance
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_profiles IS 'Aggregated project metadata for similarity matching and pattern analysis';
COMMENT ON TABLE recommendations IS 'AI-generated recommendations for projects';
COMMENT ON TABLE lessons_learned IS 'Lessons learned from completed projects for contextual recommendations';
COMMENT ON TABLE project_patterns IS 'Calculated patterns and trends across organization projects';
COMMENT ON TABLE subcontractor_performance IS 'Aggregated performance metrics for subcontractors/vendors';

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Migration completed successfully
-- Tables created: 5
-- Enums created: 5
-- Indexes created: 18
-- Triggers created: 5
