-- ============================================================================
-- FIELD NOTE TEMPLATES - SEED DATA
-- ============================================================================
-- Inserts system templates for common field note scenarios
-- These templates are marked as system templates (is_system = true)
-- and cannot be edited or deleted by users
-- ============================================================================

-- Get a system user ID for created_by_id (use first admin user)
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  SELECT id INTO system_user_id
  FROM users
  WHERE system_role = 'system_admin'
  LIMIT 1;

  IF system_user_id IS NULL THEN
    -- If no admin, use first user
    SELECT id INTO system_user_id FROM users LIMIT 1;
  END IF;

  -- Template 1: Daily Weather Report
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Daily Weather Report',
    'Standard template for recording daily weather conditions and impact on work',
    'WEATHER',
    true,
    true,
    '{
      "fields": [
        {
          "key": "temperature",
          "label": "Temperature (°F)",
          "type": "number",
          "required": true,
          "placeholder": "Enter temperature",
          "validation": {"min": -50, "max": 150}
        },
        {
          "key": "condition",
          "label": "Weather Condition",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Clear", "value": "clear"},
            {"label": "Partly Cloudy", "value": "partly_cloudy"},
            {"label": "Cloudy", "value": "cloudy"},
            {"label": "Rain", "value": "rain"},
            {"label": "Heavy Rain", "value": "heavy_rain"},
            {"label": "Snow", "value": "snow"},
            {"label": "Storm", "value": "storm"}
          ]
        },
        {
          "key": "wind_speed",
          "label": "Wind Speed (mph)",
          "type": "number",
          "required": false,
          "placeholder": "Enter wind speed",
          "validation": {"min": 0, "max": 200}
        },
        {
          "key": "precipitation",
          "label": "Precipitation (inches)",
          "type": "number",
          "required": false,
          "placeholder": "Enter precipitation amount",
          "validation": {"min": 0}
        },
        {
          "key": "work_impact",
          "label": "Impact on Work",
          "type": "select",
          "required": true,
          "options": [
            {"label": "No Impact", "value": "none"},
            {"label": "Minor Delays", "value": "minor"},
            {"label": "Moderate Delays", "value": "moderate"},
            {"label": "Severe Delays", "value": "severe"},
            {"label": "Work Stopped", "value": "stopped"}
          ]
        },
        {
          "key": "details",
          "label": "Additional Details",
          "type": "textarea",
          "required": false,
          "placeholder": "Enter any additional weather-related observations or impacts"
        }
      ]
    }'::jsonb,
    '{"priority": "NORMAL", "visibility": "PUBLIC", "followUpRequired": false}'::jsonb,
    'Daily Reporting',
    10,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 2: Safety Concern Report
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Safety Concern Report',
    'Template for documenting safety hazards or concerns observed on site',
    'SAFETY_CONCERN',
    true,
    true,
    '{
      "fields": [
        {
          "key": "hazard_type",
          "label": "Hazard Type",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Fall Hazard", "value": "fall"},
            {"label": "Electrical Hazard", "value": "electrical"},
            {"label": "Chemical Exposure", "value": "chemical"},
            {"label": "Equipment Malfunction", "value": "equipment"},
            {"label": "Unsafe Practices", "value": "practices"},
            {"label": "Environmental", "value": "environmental"},
            {"label": "Other", "value": "other"}
          ]
        },
        {
          "key": "severity",
          "label": "Severity Level",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Low - Minor Risk", "value": "low"},
            {"label": "Medium - Moderate Risk", "value": "medium"},
            {"label": "High - Serious Risk", "value": "high"},
            {"label": "Critical - Immediate Danger", "value": "critical"}
          ]
        },
        {
          "key": "location_detail",
          "label": "Specific Location",
          "type": "text",
          "required": true,
          "placeholder": "Describe exact location of hazard",
          "validation": {"maxLength": 500}
        },
        {
          "key": "people_affected",
          "label": "Number of People at Risk",
          "type": "number",
          "required": false,
          "placeholder": "Estimate number of workers at risk",
          "validation": {"min": 0}
        },
        {
          "key": "immediate_action",
          "label": "Immediate Action Taken",
          "type": "textarea",
          "required": true,
          "placeholder": "Describe any immediate corrective actions taken"
        },
        {
          "key": "follow_up_needed",
          "label": "Follow-up Action Required",
          "type": "textarea",
          "required": false,
          "placeholder": "Describe any additional actions needed to resolve"
        }
      ]
    }'::jsonb,
    '{"priority": "HIGH", "visibility": "TEAM", "followUpRequired": true}'::jsonb,
    'Safety',
    20,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 3: Site Meeting Notes
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Site Meeting Notes',
    'Template for recording meeting minutes and action items',
    'MEETING',
    true,
    true,
    '{
      "fields": [
        {
          "key": "meeting_type",
          "label": "Meeting Type",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Daily Toolbox Talk", "value": "toolbox"},
            {"label": "Weekly Coordination", "value": "coordination"},
            {"label": "Safety Meeting", "value": "safety"},
            {"label": "Owner Meeting", "value": "owner"},
            {"label": "Subcontractor Meeting", "value": "subcontractor"},
            {"label": "Other", "value": "other"}
          ]
        },
        {
          "key": "attendees",
          "label": "Attendees",
          "type": "textarea",
          "required": true,
          "placeholder": "List all meeting attendees"
        },
        {
          "key": "agenda",
          "label": "Agenda / Topics Discussed",
          "type": "textarea",
          "required": true,
          "placeholder": "Enter meeting agenda or discussion topics"
        },
        {
          "key": "decisions",
          "label": "Decisions Made",
          "type": "textarea",
          "required": false,
          "placeholder": "Document key decisions"
        },
        {
          "key": "action_items",
          "label": "Action Items",
          "type": "textarea",
          "required": false,
          "placeholder": "List action items with responsible parties and due dates"
        },
        {
          "key": "next_meeting",
          "label": "Next Meeting Date",
          "type": "date",
          "required": false
        }
      ]
    }'::jsonb,
    '{"priority": "NORMAL", "visibility": "TEAM", "followUpRequired": false}'::jsonb,
    'Communication',
    30,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 4: Quality Inspection Report
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Quality Inspection Report',
    'Template for documenting quality inspections and deficiencies',
    'INSPECTION',
    true,
    true,
    '{
      "fields": [
        {
          "key": "inspection_type",
          "label": "Inspection Type",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Structural", "value": "structural"},
            {"label": "Mechanical", "value": "mechanical"},
            {"label": "Electrical", "value": "electrical"},
            {"label": "Plumbing", "value": "plumbing"},
            {"label": "Finishes", "value": "finishes"},
            {"label": "Site Work", "value": "sitework"},
            {"label": "Other", "value": "other"}
          ]
        },
        {
          "key": "work_inspected",
          "label": "Work Being Inspected",
          "type": "text",
          "required": true,
          "placeholder": "Describe the work being inspected",
          "validation": {"maxLength": 500}
        },
        {
          "key": "result",
          "label": "Inspection Result",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Pass - Acceptable", "value": "pass"},
            {"label": "Pass with Comments", "value": "pass_comments"},
            {"label": "Conditional - Minor Issues", "value": "conditional"},
            {"label": "Fail - Major Issues", "value": "fail"},
            {"label": "Not Ready for Inspection", "value": "not_ready"}
          ]
        },
        {
          "key": "deficiencies",
          "label": "Deficiencies Found",
          "type": "textarea",
          "required": false,
          "placeholder": "List any deficiencies or issues found"
        },
        {
          "key": "corrective_action",
          "label": "Corrective Action Required",
          "type": "textarea",
          "required": false,
          "placeholder": "Describe corrective actions needed"
        },
        {
          "key": "reinspection_date",
          "label": "Re-inspection Date",
          "type": "date",
          "required": false
        }
      ]
    }'::jsonb,
    '{"priority": "NORMAL", "visibility": "TEAM", "followUpRequired": false, "tags": ["inspection", "quality"]}'::jsonb,
    'Quality Control',
    40,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 5: Delivery Receipt
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Delivery Receipt',
    'Template for documenting material deliveries to the site',
    'DELIVERY',
    true,
    true,
    '{
      "fields": [
        {
          "key": "supplier",
          "label": "Supplier / Vendor",
          "type": "text",
          "required": true,
          "placeholder": "Enter supplier name",
          "validation": {"maxLength": 255}
        },
        {
          "key": "delivery_number",
          "label": "Delivery/PO Number",
          "type": "text",
          "required": false,
          "placeholder": "Enter delivery or purchase order number",
          "validation": {"maxLength": 100}
        },
        {
          "key": "materials",
          "label": "Materials Delivered",
          "type": "textarea",
          "required": true,
          "placeholder": "List all materials delivered with quantities"
        },
        {
          "key": "condition",
          "label": "Condition Upon Arrival",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Good - No Damage", "value": "good"},
            {"label": "Minor Damage", "value": "minor_damage"},
            {"label": "Major Damage", "value": "major_damage"},
            {"label": "Rejected", "value": "rejected"}
          ]
        },
        {
          "key": "damage_notes",
          "label": "Damage/Issue Notes",
          "type": "textarea",
          "required": false,
          "placeholder": "Describe any damage or issues"
        },
        {
          "key": "storage_location",
          "label": "Storage Location",
          "type": "text",
          "required": false,
          "placeholder": "Where materials are stored",
          "validation": {"maxLength": 255}
        },
        {
          "key": "received_by",
          "label": "Received By",
          "type": "text",
          "required": true,
          "placeholder": "Name of person receiving delivery",
          "validation": {"maxLength": 255}
        }
      ]
    }'::jsonb,
    '{"priority": "NORMAL", "visibility": "TEAM", "followUpRequired": false, "tags": ["delivery", "materials"]}'::jsonb,
    'Logistics',
    50,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 6: Work Delay Report
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Work Delay Report',
    'Template for documenting work delays and their causes',
    'DELAY',
    true,
    true,
    '{
      "fields": [
        {
          "key": "delay_type",
          "label": "Delay Type",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Weather", "value": "weather"},
            {"label": "Material Shortage", "value": "material"},
            {"label": "Equipment Breakdown", "value": "equipment"},
            {"label": "Labor Shortage", "value": "labor"},
            {"label": "Design Issue", "value": "design"},
            {"label": "Permit/Inspection", "value": "permit"},
            {"label": "Owner Request", "value": "owner"},
            {"label": "Coordination Issue", "value": "coordination"},
            {"label": "Other", "value": "other"}
          ]
        },
        {
          "key": "work_affected",
          "label": "Work Activity Affected",
          "type": "text",
          "required": true,
          "placeholder": "Describe the work activity that was delayed",
          "validation": {"maxLength": 500}
        },
        {
          "key": "duration",
          "label": "Duration of Delay (hours)",
          "type": "number",
          "required": true,
          "placeholder": "Enter delay duration",
          "validation": {"min": 0}
        },
        {
          "key": "workers_affected",
          "label": "Number of Workers Affected",
          "type": "number",
          "required": false,
          "placeholder": "Number of workers unable to work",
          "validation": {"min": 0}
        },
        {
          "key": "cause_detail",
          "label": "Detailed Cause",
          "type": "textarea",
          "required": true,
          "placeholder": "Provide detailed explanation of delay cause"
        },
        {
          "key": "recovery_plan",
          "label": "Recovery Plan",
          "type": "textarea",
          "required": false,
          "placeholder": "Describe plan to recover from delay"
        },
        {
          "key": "cost_impact",
          "label": "Estimated Cost Impact ($)",
          "type": "number",
          "required": false,
          "placeholder": "Estimated cost of delay",
          "validation": {"min": 0}
        }
      ]
    }'::jsonb,
    '{"priority": "HIGH", "visibility": "TEAM", "followUpRequired": true, "tags": ["delay", "schedule"]}'::jsonb,
    'Schedule',
    60,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Template 7: Visitor Log
  INSERT INTO field_note_templates (
    id, name, description, note_type, is_system, is_active,
    template_fields, default_values, category, display_order,
    usage_count, organization_id, created_by_id, updated_by_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    'Visitor Log',
    'Template for recording site visitors and their purpose',
    'VISITOR',
    true,
    true,
    '{
      "fields": [
        {
          "key": "visitor_name",
          "label": "Visitor Name",
          "type": "text",
          "required": true,
          "placeholder": "Enter visitor full name",
          "validation": {"maxLength": 255}
        },
        {
          "key": "company",
          "label": "Company/Organization",
          "type": "text",
          "required": true,
          "placeholder": "Enter company name",
          "validation": {"maxLength": 255}
        },
        {
          "key": "purpose",
          "label": "Purpose of Visit",
          "type": "select",
          "required": true,
          "options": [
            {"label": "Inspection", "value": "inspection"},
            {"label": "Owner/Client Visit", "value": "owner"},
            {"label": "Design Team", "value": "design"},
            {"label": "Vendor/Supplier", "value": "vendor"},
            {"label": "Government Official", "value": "official"},
            {"label": "Subcontractor", "value": "subcontractor"},
            {"label": "Media", "value": "media"},
            {"label": "Other", "value": "other"}
          ]
        },
        {
          "key": "purpose_detail",
          "label": "Visit Details",
          "type": "textarea",
          "required": false,
          "placeholder": "Additional details about the visit"
        },
        {
          "key": "safety_briefing",
          "label": "Safety Briefing Completed",
          "type": "checkbox",
          "required": false,
          "defaultValue": false
        },
        {
          "key": "ppe_provided",
          "label": "PPE Provided",
          "type": "checkbox",
          "required": false,
          "defaultValue": false
        },
        {
          "key": "escorted_by",
          "label": "Escorted By",
          "type": "text",
          "required": false,
          "placeholder": "Name of person escorting visitor",
          "validation": {"maxLength": 255}
        }
      ]
    }'::jsonb,
    '{"priority": "NORMAL", "visibility": "TEAM", "followUpRequired": false, "tags": ["visitor", "safety"]}'::jsonb,
    'Safety',
    70,
    0,
    NULL,
    system_user_id,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

END $$;

-- Display summary of inserted templates
SELECT
  name,
  note_type,
  category,
  display_order,
  is_system,
  is_active
FROM field_note_templates
WHERE is_system = true
ORDER BY display_order;
