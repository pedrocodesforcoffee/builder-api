-- Seed Submittals for Downtown Office Tower project
-- This script inserts 8 sample submittals with various statuses and types

INSERT INTO submittals (
  "projectId",
  "organizationId",
  number,
  "sequenceNumber",
  title,
  description,
  "specSection",
  "specSectionTitle",
  "submittalType",
  status,
  priority,
  "currentRevision",
  "responsibleContractorId",
  "reviewTimeDays",
  "createdById"
) VALUES
-- SUB-001: Structural Steel Shop Drawings
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-001', 1, 'Structural Steel Shop Drawings',
 'Shop drawings for structural steel beams and columns for Building A',
 '05 12 00', 'Structural Steel Framing',
 'SHOP_DRAWING', 'SUBMITTED', 'HIGH', 0,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-002: HVAC Equipment Submittals
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-002', 2, 'HVAC Equipment Submittals',
 'Product data for rooftop HVAC units',
 '23 74 00', 'Packaged HVAC Units',
 'PRODUCT_DATA', 'UNDER_REVIEW', 'MEDIUM', 1,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-003: Concrete Mix Design
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-003', 3, 'Concrete Mix Design',
 'Mix design for foundation concrete - 4000 PSI',
 '03 30 00', 'Cast-in-Place Concrete',
 'TEST_REPORT', 'APPROVED', 'CRITICAL', 0,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-004: Window System Samples
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-004', 4, 'Window System Samples',
 'Physical samples of curtain wall system',
 '08 44 00', 'Curtain Wall Systems',
 'SAMPLE', 'NOT_STARTED', 'HIGH', 0,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-005: Fire Protection System Product Data
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-005', 5, 'Fire Protection System Product Data',
 'Sprinkler heads, pipe, and fittings specifications',
 '21 13 00', 'Wet-Pipe Sprinkler Systems',
 'PRODUCT_DATA', 'SUBMITTED', 'MEDIUM', 0,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-006: Electrical Panel Schedule
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-006', 6, 'Electrical Panel Schedule',
 'Shop drawings for main electrical distribution panels',
 '26 24 00', 'Switchboards and Panelboards',
 'SHOP_DRAWING', 'APPROVED_AS_NOTED', 'HIGH', 1,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-007: Elevator Equipment Submittals
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-007', 7, 'Elevator Equipment Submittals',
 'Complete elevator system specifications and certifications',
 '14 21 00', 'Electric Traction Elevators',
 'PRODUCT_DATA', 'REVISE_RESUBMIT', 'MEDIUM', 2,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739'),

-- SUB-008: Roofing Material Warranty
('a6074e71-6f3f-40c0-a201-1e87b238df81', '0aaff3fc-0769-476f-a031-223b4c57dcf5',
 'SUB-008', 8, 'Roofing Material Warranty',
 'Manufacturer warranty documentation for roofing system',
 '07 50 00', 'Membrane Roofing',
 'CLOSEOUT', 'APPROVED', 'LOW', 0,
 '0aaff3fc-0769-476f-a031-223b4c57dcf5', 14,
 '1f8bebfa-06c5-468b-b676-6a3072094739');

-- Show results
SELECT COUNT(*) as "Total Submittals" FROM submittals;
SELECT number, title, status, priority FROM submittals ORDER BY number;
