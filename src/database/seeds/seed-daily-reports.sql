-- Seed Daily Reports for Downtown Office Tower project
-- This script inserts sample daily reports with various statuses and data

-- Daily Report 1: Approved report from last week
DO $$
DECLARE
  report_id_1 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id,
    "projectId",
    "reportDate",
    status,
    "weatherConditionAm",
    "weatherConditionPm",
    "temperatureHigh",
    "temperatureLow",
    "precipitationInches",
    "windSpeedMph",
    humidity,
    "weatherImpact",
    "weatherNotes",
    "workSummary",
    "generalNotes",
    "tomorrowPlan",
    "totalWorkers",
    "totalManHours",
    "signatureData",
    "signedAt",
    "signedIp",
    "submittedAt",
    "approvedAt",
    "approvedById",
    "createdById",
    "createdAt",
    "updatedAt"
  ) VALUES (
    report_id_1,
    'a6074e71-6f3f-40c0-a201-1e87b238df81', -- Downtown Office Tower
    CURRENT_DATE - INTERVAL '7 days',
    'APPROVED',
    'CLEAR',
    'PARTLY_CLOUDY',
    75,
    58,
    0.0,
    8,
    65,
    'NONE',
    'Perfect weather for concrete work',
    'Foundation concrete pour completed successfully. Placed 120 cubic yards of concrete for east wing foundation. All rebar inspections passed. Concrete pump worked efficiently throughout the day.',
    'Safety meeting conducted at 7:00 AM. No incidents reported. Equipment functioning properly.',
    'Continue foundation work on west wing. Schedule concrete delivery for 7:00 AM. Prepare rebar for next pour.',
    24,
    192.00,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    CURRENT_TIMESTAMP - INTERVAL '7 days 12 hours',
    '192.168.1.100',
    CURRENT_TIMESTAMP - INTERVAL '7 days 12 hours',
    CURRENT_TIMESTAMP - INTERVAL '7 days 11 hours',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '7 days 18 hours',
    CURRENT_TIMESTAMP - INTERVAL '7 days 11 hours'
  );

  -- Manpower for Report 1
  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "overtimeHours", "costCode", notes) VALUES
  (report_id_1, 'Concrete Finishers', 'ABC Concrete', 8, 8.00, 0, '03-3000', 'Crew performed excellently'),
  (report_id_1, 'Laborers', 'General Labor Co', 10, 8.00, 0, '01-5000', 'Material handling and cleanup'),
  (report_id_1, 'Iron Workers', 'Steel Fabricators Inc', 6, 8.00, 0, '03-2000', 'Rebar placement and tying');

  -- Equipment for Report 1
  INSERT INTO daily_equipment ("dailyReportId", "equipmentName", "equipmentId", quantity, "hoursUsed", "idleHours", "operatorName", "maintenanceIssues", "fuelUsed", "fuelUnit") VALUES
  (report_id_1, 'Concrete Pump', 'PUMP-001', 1, 6.00, 2.00, 'Mike Johnson', NULL, 45.5, 'gallons'),
  (report_id_1, 'Excavator', 'EXC-003', 1, 8.00, 0, 'Tom Wilson', NULL, 28.0, 'gallons'),
  (report_id_1, 'Crane 50-Ton', 'CRN-005', 1, 7.00, 1.00, 'Sarah Brown', 'Minor hydraulic leak - scheduled for repair', 35.0, 'gallons');

  -- Work Logs for Report 1
  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode", "percentComplete", "quantityInstalled", unit, issues) VALUES
  (report_id_1, 'East Wing Foundation', 'Concrete pour for foundation walls', '03-3000', 100.0, 120, 'cubic yards', NULL),
  (report_id_1, 'East Wing Foundation', 'Rebar installation and inspection', '03-2000', 100.0, 2400, 'linear feet', NULL),
  (report_id_1, 'Site Perimeter', 'Temporary fencing maintenance', '01-5000', NULL, NULL, NULL, NULL);

  -- Materials for Report 1
  INSERT INTO daily_materials ("dailyReportId", "materialName", quantity, unit, supplier, "costCode", "isDelivery", "isInstalled", "deliveryTicketNumber", notes) VALUES
  (report_id_1, 'Ready-Mix Concrete 4000 PSI', 120, 'cubic yards', 'Metro Concrete Supply', '03-3000', true, true, 'DT-789456', 'Delivered in 15 loads'),
  (report_id_1, 'Rebar #5', 2400, 'linear feet', 'Steel Supply Inc', '03-2000', false, true, NULL, 'From existing stock'),
  (report_id_1, 'Form Release Agent', 12, 'gallons', 'Construction Materials Co', '03-3000', true, true, 'DT-789457', NULL);

  -- Inspections for Report 1
  INSERT INTO daily_inspections ("dailyReportId", "inspectionType", "inspectorName", "inspectorCompany", "inspectorPhone", result, "failedItems", notes, "reportNumber") VALUES
  (report_id_1, 'Rebar Placement', 'James Mitchell', 'City Building Dept', '555-0123', 'PASS', NULL, 'All rebar meets specifications. Spacing and coverage verified.', 'INSP-2025-0145'),
  (report_id_1, 'Concrete Slump Test', 'Robert Lee', 'Quality Testing Services', '555-0456', 'PASS', NULL, 'Slump: 4 inches. Within acceptable range.', 'QTS-2025-0298');

  -- Visitors for Report 1
  INSERT INTO daily_visitors ("dailyReportId", "visitorName", company, purpose, "timeIn", "timeOut", "badgeNumber") VALUES
  (report_id_1, 'David Chen', 'Owner Representative', 'Weekly progress review', '09:00 AM', '11:30 AM', 'V-1234'),
  (report_id_1, 'Maria Garcia', 'ABC Architecture', 'Site observation', '10:00 AM', '02:00 PM', 'V-1235');

END $$;

-- Daily Report 2: Submitted report from yesterday
DO $$
DECLARE
  report_id_2 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id,
    "projectId",
    "reportDate",
    status,
    "weatherConditionAm",
    "weatherConditionPm",
    "temperatureHigh",
    "temperatureLow",
    "precipitationInches",
    "windSpeedMph",
    humidity,
    "weatherImpact",
    "weatherNotes",
    "workSummary",
    "generalNotes",
    "tomorrowPlan",
    "totalWorkers",
    "totalManHours",
    "signatureData",
    "signedAt",
    "signedIp",
    "submittedAt",
    "createdById",
    "createdAt",
    "updatedAt"
  ) VALUES (
    report_id_2,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE - INTERVAL '1 day',
    'SUBMITTED',
    'CLOUDY',
    'RAIN',
    68,
    54,
    0.45,
    12,
    78,
    'MINOR',
    'Light rain in afternoon delayed exterior work by 2 hours',
    'Structural steel erection continued on Level 2. Installed 18 beams and 24 columns. Interior framing for Level 1 progressed well despite weather. MEP rough-in coordination meeting held.',
    'Afternoon rain caused temporary work stoppage for exterior activities. Crews shifted to interior work. All materials covered properly.',
    'Complete Level 2 steel erection. Begin fireproofing application on Level 1. Continue MEP rough-in coordination.',
    32,
    246.00,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours',
    '192.168.1.101',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '1 day 20 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours'
  );

  -- Manpower for Report 2
  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "overtimeHours", "costCode") VALUES
  (report_id_2, 'Iron Workers', 'Steel Fabricators Inc', 12, 7.50, 0, '05-1200'),
  (report_id_2, 'Carpenters', 'Precision Framing', 10, 8.00, 0, '06-1000'),
  (report_id_2, 'Electricians', 'Metro Electric', 6, 8.00, 0, '26-0000'),
  (report_id_2, 'Plumbers', 'ABC Plumbing', 4, 8.00, 0, '22-0000');

  -- Equipment for Report 2
  INSERT INTO daily_equipment ("dailyReportId", "equipmentName", "equipmentId", quantity, "hoursUsed", "operatorName") VALUES
  (report_id_2, 'Tower Crane', 'CRN-001', 1, 7.50, 'Bill Anderson'),
  (report_id_2, 'Forklift 5000lb', 'FRK-008', 2, 8.00, 'Multiple Operators'),
  (report_id_2, 'Man Lift 60ft', 'MLT-012', 1, 6.00, 'Steve Martinez');

  -- Work Logs for Report 2
  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode", "percentComplete", "quantityInstalled", unit, issues) VALUES
  (report_id_2, 'Level 2', 'Structural steel beam installation', '05-1200', 75.0, 18, 'beams', NULL),
  (report_id_2, 'Level 2', 'Structural steel column installation', '05-1200', 80.0, 24, 'columns', NULL),
  (report_id_2, 'Level 1', 'Interior metal framing', '06-1000', 45.0, NULL, NULL, NULL),
  (report_id_2, 'Level 1', 'Electrical rough-in', '26-0000', 30.0, NULL, NULL, 'Coordination with plumbing required');

  -- Delays for Report 2
  INSERT INTO daily_delays ("dailyReportId", type, description, "hoursLost", impact, "affectedTrades", "potentialClaim") VALUES
  (report_id_2, 'WEATHER', 'Afternoon rain stopped exterior steel work', 2.00, 'MINOR', 'Iron Workers', false);

  -- Materials for Report 2
  INSERT INTO daily_materials ("dailyReportId", "materialName", quantity, unit, supplier, "isDelivery", "isInstalled", "deliveryTicketNumber") VALUES
  (report_id_2, 'W12x45 Steel Beams', 18, 'pieces', 'American Steel', true, true, 'DT-856234'),
  (report_id_2, 'HSS6x6x3/8 Columns', 24, 'pieces', 'American Steel', true, true, 'DT-856235'),
  (report_id_2, 'Metal Studs 6"', 1200, 'linear feet', 'Drywall Supply Co', true, false, 'DT-456789');

END $$;

-- Daily Report 3: Draft report for today
DO $$
DECLARE
  report_id_3 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id,
    "projectId",
    "reportDate",
    status,
    "weatherConditionAm",
    "weatherConditionPm",
    "temperatureHigh",
    "temperatureLow",
    humidity,
    "weatherImpact",
    "workSummary",
    "totalWorkers",
    "totalManHours",
    "createdById",
    "createdAt",
    "updatedAt"
  ) VALUES (
    report_id_3,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE,
    'DRAFT',
    'CLEAR',
    NULL,
    70,
    56,
    60,
    'NONE',
    'Work in progress - report being compiled',
    28,
    196.00,
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
  );

  -- Manpower for Report 3 (in progress)
  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "costCode") VALUES
  (report_id_3, 'Iron Workers', 'Steel Fabricators Inc', 12, 7.00, '05-1200'),
  (report_id_3, 'Carpenters', 'Precision Framing', 10, 7.00, '06-1000'),
  (report_id_3, 'Electricians', 'Metro Electric', 6, 7.00, '26-0000');

  -- Work Logs for Report 3
  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode", "percentComplete") VALUES
  (report_id_3, 'Level 2', 'Continuing structural steel erection', '05-1200', NULL),
  (report_id_3, 'Level 1', 'Fireproofing application', '07-8100', NULL);

END $$;

-- Daily Report 4: Rejected report from 3 days ago
DO $$
DECLARE
  report_id_4 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id,
    "projectId",
    "reportDate",
    status,
    "weatherConditionAm",
    "weatherConditionPm",
    "temperatureHigh",
    "temperatureLow",
    "weatherImpact",
    "workSummary",
    "generalNotes",
    "totalWorkers",
    "totalManHours",
    "signatureData",
    "signedAt",
    "signedIp",
    "submittedAt",
    "rejectionReason",
    "createdById",
    "createdAt",
    "updatedAt"
  ) VALUES (
    report_id_4,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE - INTERVAL '3 days',
    'REJECTED',
    'PARTLY_CLOUDY',
    'CLEAR',
    72,
    58,
    'NONE',
    'Foundation waterproofing and backfill operations',
    'Work progressed as scheduled',
    18,
    144.00,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    CURRENT_TIMESTAMP - INTERVAL '3 days 14 hours',
    '192.168.1.102',
    CURRENT_TIMESTAMP - INTERVAL '3 days 14 hours',
    'Missing inspection documentation and material delivery tickets. Please add inspection reports for waterproofing application and provide delivery tickets for all materials used.',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '3 days 20 hours',
    CURRENT_TIMESTAMP - INTERVAL '3 days 10 hours'
  );

  -- Manpower for Report 4
  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked") VALUES
  (report_id_4, 'Waterproofing Specialists', 'WaterTight Systems', 8, 8.00),
  (report_id_4, 'Laborers', 'General Labor Co', 10, 8.00);

  -- Work Logs for Report 4
  INSERT INTO daily_work ("dailyReportId", location, activity, "percentComplete") VALUES
  (report_id_4, 'Foundation Walls', 'Waterproofing membrane application', 100.0),
  (report_id_4, 'East Side', 'Backfill operations', 60.0);

END $$;
