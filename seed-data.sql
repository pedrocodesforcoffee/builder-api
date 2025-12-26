-- Seed data for builder_api_dev database
-- Run with: psql builder_api_dev < seed-data.sql

-- Get IDs we'll use
DO $$
DECLARE
  admin_id UUID;
  org_id UUID;
  project1_id UUID;
  project2_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM users WHERE email = 'admin@example.com';

  -- Get organization ID
  SELECT id INTO org_id FROM organizations LIMIT 1;

  -- Create Project 1: Commercial Office Building
  INSERT INTO projects (
    number, name, organization_id, type, status,
    description, start_date, end_date,
    original_contract, current_contract, percent_complete
  ) VALUES (
    'PROJ-2025-001',
    'Downtown Office Tower',
    org_id,
    'commercial',
    'construction',
    'A 25-story mixed-use office tower in downtown with retail space on ground floor',
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE + INTERVAL '365 days',
    15000000.00,
    15250000.00,
    35.5
  ) RETURNING id INTO project1_id;

  -- Add admin as project member for Project 1
  IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = project1_id AND user_id = admin_id) THEN
    INSERT INTO project_members (project_id, user_id, role, joined_at)
    VALUES (project1_id, admin_id, 'project_admin', CURRENT_TIMESTAMP);
  END IF;

  -- Create Project 2: Residential Development
  INSERT INTO projects (
    number, name, organization_id, type, status,
    description, start_date, end_date,
    original_contract, current_contract, percent_complete
  ) VALUES (
    'PROJ-2025-002',
    'Riverside Apartments',
    org_id,
    'residential',
    'preconstruction',
    '120-unit luxury apartment complex with amenities and parking',
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '540 days',
    8500000.00,
    8500000.00,
    5.0
  ) RETURNING id INTO project2_id;

  -- Add admin as project member for Project 2
  IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = project2_id AND user_id = admin_id) THEN
    INSERT INTO project_members (project_id, user_id, role, joined_at)
    VALUES (project2_id, admin_id, 'project_admin', CURRENT_TIMESTAMP);
  END IF;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Created projects: % and %', project1_id, project2_id;
END $$;

-- Display results
SELECT
  'USERS' as table_name,
  COUNT(*)::text as count
FROM users
UNION ALL
SELECT
  'ORGANIZATIONS',
  COUNT(*)::text
FROM organizations
UNION ALL
SELECT
  'PROJECTS',
  COUNT(*)::text
FROM projects
UNION ALL
SELECT
  'PROJECT_MEMBERS',
  COUNT(*)::text
FROM project_members
ORDER BY table_name;
