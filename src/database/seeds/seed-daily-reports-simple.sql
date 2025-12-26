-- Simple Seed Daily Reports for Downtown Office Tower project
-- This script inserts 4 sample daily reports with various statuses

-- Daily Report 1: Approved report from last week
DO $$
DECLARE
  report_id_1 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id, "projectId", "reportDate", status,
    "weatherConditionAm", "weatherConditionPm",
    "temperatureHigh", "temperatureLow", humidity, "weatherImpact",
    "workSummary", "generalNotes", "tomorrowPlan",
    "totalWorkers", "totalManHours",
    "signatureData", "signedAt", "signedIp",
    "submittedAt", "approvedAt", "approvedById",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    report_id_1,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE - INTERVAL '7 days',
    'APPROVED',
    'CLEAR', 'PARTLY_CLOUDY',
    75, 58, 65, 'NONE',
    'Foundation concrete pour completed successfully. Placed 120 cubic yards of concrete.',
    'Safety meeting conducted at 7:00 AM. No incidents reported.',
    'Continue foundation work on west wing.',
    24, 192.00,
    'data:image/png;base64,signature',
    CURRENT_TIMESTAMP - INTERVAL '7 days 12 hours',
    '192.168.1.100',
    CURRENT_TIMESTAMP - INTERVAL '7 days 12 hours',
    CURRENT_TIMESTAMP - INTERVAL '7 days 11 hours',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '7 days 18 hours',
    CURRENT_TIMESTAMP - INTERVAL '7 days 11 hours'
  );

  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "costCode") VALUES
  (report_id_1, 'Concrete Finishers', 'ABC Concrete', 8, 8.00, '03-3000'),
  (report_id_1, 'Laborers', 'General Labor Co', 10, 8.00, '01-5000'),
  (report_id_1, 'Iron Workers', 'Steel Fabricators', 6, 8.00, '03-2000');

  INSERT INTO daily_equipment ("dailyReportId", "equipmentName", "equipmentId", quantity, "hoursUsed", "operatorName") VALUES
  (report_id_1, 'Concrete Pump', 'PUMP-001', 1, 6.00, 'Mike Johnson'),
  (report_id_1, 'Excavator', 'EXC-003', 1, 8.00, 'Tom Wilson');

  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode", "percentComplete") VALUES
  (report_id_1, 'East Wing Foundation', 'Concrete pour for foundation walls', '03-3000', 100),
  (report_id_1, 'East Wing Foundation', 'Rebar installation and inspection', '03-2000', 100);

  INSERT INTO daily_materials ("dailyReportId", "materialName", quantity, unit, supplier, "isDelivery", "isInstalled") VALUES
  (report_id_1, 'Ready-Mix Concrete 4000 PSI', 120, 'cubic yards', 'Metro Concrete Supply', true, true),
  (report_id_1, 'Rebar #5', 2400, 'linear feet', 'Steel Supply Inc', false, true);

END $$;

-- Daily Report 2: Submitted report from yesterday
DO $$
DECLARE
  report_id_2 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id, "projectId", "reportDate", status,
    "weatherConditionAm", "weatherConditionPm",
    "temperatureHigh", "temperatureLow", "precipitationInches", humidity, "weatherImpact",
    "weatherNotes", "workSummary", "generalNotes", "tomorrowPlan",
    "totalWorkers", "totalManHours",
    "signatureData", "signedAt", "signedIp", "submittedAt",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    report_id_2,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE - INTERVAL '1 day',
    'SUBMITTED',
    'CLOUDY', 'RAIN',
    68, 54, 0.45, 78, 'MINOR',
    'Light rain in afternoon delayed exterior work by 2 hours',
    'Structural steel erection continued on Level 2. Installed 18 beams and 24 columns.',
    'Afternoon rain caused temporary work stoppage. Crews shifted to interior work.',
    'Complete Level 2 steel erection. Begin fireproofing on Level 1.',
    32, 246.00,
    'data:image/png;base64,signature',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours',
    '192.168.1.101',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '1 day 20 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 day 14 hours'
  );

  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "costCode") VALUES
  (report_id_2, 'Iron Workers', 'Steel Fabricators', 12, 7.50, '05-1200'),
  (report_id_2, 'Carpenters', 'Precision Framing', 10, 8.00, '06-1000'),
  (report_id_2, 'Electricians', 'Metro Electric', 6, 8.00, '26-0000'),
  (report_id_2, 'Plumbers', 'ABC Plumbing', 4, 8.00, '22-0000');

  INSERT INTO daily_equipment ("dailyReportId", "equipmentName", quantity, "hoursUsed", "operatorName") VALUES
  (report_id_2, 'Tower Crane', 1, 7.50, 'Bill Anderson'),
  (report_id_2, 'Forklift 5000lb', 2, 8.00, 'Multiple Operators');

  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode", "percentComplete") VALUES
  (report_id_2, 'Level 2', 'Structural steel beam installation', '05-1200', 75),
  (report_id_2, 'Level 2', 'Structural steel column installation', '05-1200', 80),
  (report_id_2, 'Level 1', 'Interior metal framing', '06-1000', 45);

  INSERT INTO daily_delays ("dailyReportId", type, description, "hoursLost", impact) VALUES
  (report_id_2, 'WEATHER', 'Afternoon rain stopped exterior steel work', 2.00, 'MINOR');

END $$;

-- Daily Report 3: Draft report for today
DO $$
DECLARE
  report_id_3 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id, "projectId", "reportDate", status,
    "weatherConditionAm", "temperatureHigh", "temperatureLow", humidity, "weatherImpact",
    "workSummary", "totalWorkers", "totalManHours",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    report_id_3,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE,
    'DRAFT',
    'CLEAR',
    70, 56, 60, 'NONE',
    'Work in progress - report being compiled',
    28, 196.00,
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
  );

  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked", "costCode") VALUES
  (report_id_3, 'Iron Workers', 'Steel Fabricators', 12, 7.00, '05-1200'),
  (report_id_3, 'Carpenters', 'Precision Framing', 10, 7.00, '06-1000'),
  (report_id_3, 'Electricians', 'Metro Electric', 6, 7.00, '26-0000');

  INSERT INTO daily_work ("dailyReportId", location, activity, "costCode") VALUES
  (report_id_3, 'Level 2', 'Continuing structural steel erection', '05-1200'),
  (report_id_3, 'Level 1', 'Fireproofing application', '07-8100');

END $$;

-- Daily Report 4: Rejected report from 3 days ago
DO $$
DECLARE
  report_id_4 UUID := uuid_generate_v4();
BEGIN
  INSERT INTO daily_reports (
    id, "projectId", "reportDate", status,
    "weatherConditionAm", "weatherConditionPm",
    "temperatureHigh", "temperatureLow", "weatherImpact",
    "workSummary", "generalNotes",
    "totalWorkers", "totalManHours",
    "signatureData", "signedAt", "signedIp", "submittedAt", "rejectionReason",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    report_id_4,
    'a6074e71-6f3f-40c0-a201-1e87b238df81',
    CURRENT_DATE - INTERVAL '3 days',
    'REJECTED',
    'PARTLY_CLOUDY', 'CLEAR',
    72, 58, 'NONE',
    'Foundation waterproofing and backfill operations',
    'Work progressed as scheduled',
    18, 144.00,
    'data:image/png;base64,signature',
    CURRENT_TIMESTAMP - INTERVAL '3 days 14 hours',
    '192.168.1.102',
    CURRENT_TIMESTAMP - INTERVAL '3 days 14 hours',
    'Missing inspection documentation and material delivery tickets.',
    '1f8bebfa-06c5-468b-b676-6a3072094739',
    CURRENT_TIMESTAMP - INTERVAL '3 days 20 hours',
    CURRENT_TIMESTAMP - INTERVAL '3 days 10 hours'
  );

  INSERT INTO daily_manpower ("dailyReportId", "tradeName", "companyName", headcount, "hoursWorked") VALUES
  (report_id_4, 'Waterproofing Specialists', 'WaterTight Systems', 8, 8.00),
  (report_id_4, 'Laborers', 'General Labor Co', 10, 8.00);

  INSERT INTO daily_work ("dailyReportId", location, activity, "percentComplete") VALUES
  (report_id_4, 'Foundation Walls', 'Waterproofing membrane application', 100),
  (report_id_4, 'East Side', 'Backfill operations', 60);

END $$;
