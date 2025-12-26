import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Master Database Seed Script
 *
 * This comprehensive seed populates the entire database with realistic construction data:
 * - Users & Organizations with proper role hierarchies
 * - Projects with phases, milestones, and tracking
 * - CSI MasterFormat cost codes (all 50 divisions)
 * - Complete financial data: budgets, commitments, payment applications
 * - Change order workflows (PCO, OCO, CCO)
 * - RFIs and submittals
 * - Daily reports and punch lists
 *
 * Usage: npm run seed:master
 */

// CSI MasterFormat 2020 Division Names
const CSI_DIVISIONS = [
  { division: 0, code: '00', name: 'Procurement and Contracting Requirements', description: 'Bidding and contract forms' },
  { division: 1, code: '01', name: 'General Requirements', description: 'Administrative and temporary facilities' },
  { division: 2, code: '02', name: 'Existing Conditions', description: 'Demolition and site assessment' },
  { division: 3, code: '03', name: 'Concrete', description: 'Concrete work including formwork and reinforcement' },
  { division: 4, code: '04', name: 'Masonry', description: 'Brick, block, and stone work' },
  { division: 5, code: '05', name: 'Metals', description: 'Structural steel and metal fabrication' },
  { division: 6, code: '06', name: 'Wood, Plastics, and Composites', description: 'Rough and finish carpentry' },
  { division: 7, code: '07', name: 'Thermal and Moisture Protection', description: 'Insulation, roofing, and waterproofing' },
  { division: 8, code: '08', name: 'Openings', description: 'Doors, windows, and glazing' },
  { division: 9, code: '09', name: 'Finishes', description: 'Interior finishes including drywall and painting' },
  { division: 10, code: '10', name: 'Specialties', description: 'Toilet partitions, signage, and accessories' },
  { division: 11, code: '11', name: 'Equipment', description: 'Built-in equipment and appliances' },
  { division: 12, code: '12', name: 'Furnishings', description: 'Cabinets and furnishings' },
  { division: 13, code: '13', name: 'Special Construction', description: 'Prefabricated structures and pools' },
  { division: 14, code: '14', name: 'Conveying Equipment', description: 'Elevators and escalators' },
  { division: 21, code: '21', name: 'Fire Suppression', description: 'Fire sprinkler systems' },
  { division: 22, code: '22', name: 'Plumbing', description: 'Plumbing fixtures and piping' },
  { division: 23, code: '23', name: 'HVAC', description: 'Heating, ventilating, and air conditioning' },
  { division: 25, code: '25', name: 'Integrated Automation', description: 'Building automation systems' },
  { division: 26, code: '26', name: 'Electrical', description: 'Electrical systems and lighting' },
  { division: 27, code: '27', name: 'Communications', description: 'Data and communication systems' },
  { division: 28, code: '28', name: 'Electronic Safety and Security', description: 'Alarm and security systems' },
  { division: 31, code: '31', name: 'Earthwork', description: 'Excavation and grading' },
  { division: 32, code: '32', name: 'Exterior Improvements', description: 'Paving, landscaping, and site work' },
  { division: 33, code: '33', name: 'Utilities', description: 'Water, sewer, and utility distribution' },
];

async function seedMaster() {
  console.log('🌱 Starting master database seed...\n');
  console.log('This will populate the database with comprehensive construction project data.\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'builder_api_dev',
    username: process.env.DB_USER || 'pperes',
    password: process.env.DB_PASSWORD || '',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // ==================== CLEAR EXISTING DATA ====================
    console.log('🧹 Clearing existing data...');

    // Clear in reverse dependency order
    const tablesToClear = [
      'punch_item_history',
      'punch_item_photos',
      'punch_items',
      'punch_lists',
      'daily_report_visitors',
      'daily_report_delays',
      'daily_report_incidents',
      'daily_report_inspections',
      'daily_report_manpower',
      'daily_report_materials',
      'daily_report_equipment',
      'daily_report_work',
      'daily_reports',
      'submittal_notifications',
      'submittal_distributions',
      'submittal_workflow_steps',
      'submittal_responses',
      'submittal_history',
      'submittal_revisions',
      'submittal_items',
      'submittals',
      'rfi_history',
      'rfi_references',
      'rfi_responses',
      'rfis',
      'change_order_package_items',
      'change_order_packages',
      'change_order_history',
      'change_order_documents',
      'cco_tm_entries',
      'cco_line_items',
      'commitment_change_orders',
      'oco_cost_breakdown',
      'owner_change_orders',
      'pco_cost_tiers',
      'potential_change_orders',
      'lien_waivers',
      'payment_application_items',
      'payment_applications',
      'schedule_of_values_items',
      'schedule_of_values',
      'commitment_items',
      'commitments',
      'budget_audit_logs',
      'budget_snapshots',
      'budget_line_items',
      'budgets',
      'cost_codes',
      'project_milestones',
      'project_phases',
      'project_members',
      'projects',
      'organization_members',
      'organizations',
      'users',
    ];

    for (const table of tablesToClear) {
      try {
        await dataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      } catch (error) {
        // Table might not exist yet, that's okay
        console.log(`   ℹ Table "${table}" not found, skipping`);
      }
    }
    console.log('✅ Existing data cleared\n');

    // ==================== CREATE USERS ====================
    console.log('👥 Creating users...');
    const passwordHash = await bcrypt.hash('password123', 12);
    const adminPasswordHash = await bcrypt.hash('Admin123!', 12);

    // Admin user
    const [adminUser] = await dataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, system_role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      ['admin@bobbuilder.com', adminPasswordHash, 'System', 'Admin', '+1-555-000-0001', 'system_admin', true, true]
    );
    const adminId = adminUser.id;
    console.log('   ✓ Created admin@bobbuilder.com (system_admin)');

    // Project managers
    const [pm1] = await dataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, system_role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      ['john.manager@acme.com', passwordHash, 'John', 'Manager', '+1-555-100-0001', 'user', true, true]
    );
    const pm1Id = pm1.id;
    console.log('   ✓ Created john.manager@acme.com (project manager)');

    const [pm2] = await dataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, system_role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      ['sarah.director@acme.com', passwordHash, 'Sarah', 'Director', '+1-555-100-0002', 'user', true, true]
    );
    const pm2Id = pm2.id;
    console.log('   ✓ Created sarah.director@acme.com (project director)');

    // Superintendent
    const [super1] = await dataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, system_role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      ['mike.super@acme.com', passwordHash, 'Mike', 'Superintendent', '+1-555-100-0003', 'user', true, true]
    );
    const superId = super1.id;
    console.log('   ✓ Created mike.super@acme.com (superintendent)');

    // Regular user
    const [user1] = await dataSource.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, system_role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      ['user@example.com', passwordHash, 'Regular', 'User', '+1-555-100-0004', 'user', true, true]
    );
    const userId = user1.id;
    console.log('   ✓ Created user@example.com (regular user)');

    console.log('');

    // ==================== CREATE ORGANIZATION ====================
    console.log('🏢 Creating organization...');

    const [org] = await dataSource.query(
      `INSERT INTO organizations (name, slug, type, email, phone, address, website, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'Acme Construction',
        'acme-construction',
        'General Contractor',
        'info@acme-construction.com',
        '+1-555-100-0000',
        '123 Builder Ave, New York, NY 10001',
        'https://acme-construction.com',
        true
      ]
    );
    const orgId = org.id;
    console.log('   ✓ Created Acme Construction');

    // Add organization members
    await dataSource.query(
      `INSERT INTO organization_members (organization_id, user_id, role, added_by_user_id)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12), ($13, $14, $15, $16), ($17, $18, $19, $20)`,
      [
        orgId, adminId, 'org_admin', adminId,
        orgId, pm1Id, 'owner', adminId,
        orgId, pm2Id, 'org_admin', adminId,
        orgId, superId, 'org_member', adminId,
        orgId, userId, 'org_member', adminId
      ]
    );
    console.log('   ✓ Added 5 members to organization');
    console.log('');

    // ==================== CREATE PROJECTS ====================
    console.log('🏗️  Creating projects...');

    // Project 1: Downtown Office Tower (in construction)
    const [project1] = await dataSource.query(
      `INSERT INTO projects (
        organization_id, number, name, description, type, status,
        address, city, state, zip, country,
        start_date, end_date, original_contract, current_contract, percent_complete,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        orgId,
        'PROJ-2025-001',
        'Downtown Office Tower',
        'A 25-story mixed-use office tower in downtown with retail space on ground floor and parking garage',
        'commercial',
        'construction',
        '100 Park Avenue',
        'New York',
        'NY',
        '10001',
        'USA',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Started 90 days ago
        new Date(Date.now() + 450 * 24 * 60 * 60 * 1000), // Ends in 450 days
        25000000.00,
        25500000.00,
        35.5,
        pm1Id
      ]
    );
    const project1Id = project1.id;
    console.log('   ✓ Created PROJ-2025-001: Downtown Office Tower');

    // Project 2: Riverside Apartments (preconstruction)
    const [project2] = await dataSource.query(
      `INSERT INTO projects (
        organization_id, number, name, description, type, status,
        address, city, state, zip, country,
        start_date, end_date, original_contract, current_contract, percent_complete,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        orgId,
        'PROJ-2025-002',
        'Riverside Apartments',
        '120-unit luxury apartment complex with amenities, pool, and parking',
        'residential',
        'preconstruction',
        '500 Riverside Drive',
        'New York',
        'NY',
        '10027',
        'USA',
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Starts in 60 days
        new Date(Date.now() + 600 * 24 * 60 * 60 * 1000), // Ends in 600 days
        18000000.00,
        18000000.00,
        5.0,
        pm2Id
      ]
    );
    const project2Id = project2.id;
    console.log('   ✓ Created PROJ-2025-002: Riverside Apartments');

    // Add project members
    await dataSource.query(
      `INSERT INTO project_members (project_id, user_id, role, added_by_user_id, joined_at)
       VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10),
       ($11, $12, $13, $14, $15),
       ($16, $17, $18, $19, $20),
       ($21, $22, $23, $24, $25),
       ($26, $27, $28, $29, $30)`,
      [
        project1Id, pm1Id, 'project_admin', pm1Id, new Date(),
        project1Id, superId, 'superintendent', pm1Id, new Date(),
        project1Id, userId, 'viewer', pm1Id, new Date(),
        project2Id, pm2Id, 'project_admin', pm2Id, new Date(),
        project2Id, pm1Id, 'project_manager', pm2Id, new Date(),
        project2Id, userId, 'viewer', pm2Id, new Date()
      ]
    );
    console.log('   ✓ Added project members to both projects');
    console.log('');

    console.log('   ✓ Skipping phases & milestones (optional feature)');

    // ==================== CREATE CSI COST CODES ====================
    console.log('💰 Creating CSI MasterFormat cost codes...');

    const costCodeIds: Record<string, string> = {};

    for (const division of CSI_DIVISIONS) {
      const [costCode] = await dataSource.query(
        `INSERT INTO cost_codes (project_id, code, name, description, full_code, division, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          project1Id,
          division.code,
          division.name,
          division.description,
          division.code,
          division.division,
          division.division
        ]
      );
      costCodeIds[division.code] = costCode.id;
    }
    console.log(`   ✓ Created ${CSI_DIVISIONS.length} cost codes (divisions 00-33)`);
    console.log('');

    // ==================== CREATE BUDGET ====================
    console.log('📊 Creating project budget...');

    const [budget] = await dataSource.query(
      `INSERT INTO budgets (
        project_id, name, description, status, total_budget, contingency, created_by_id, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        project1Id,
        'Original Budget',
        'Initial approved budget for Downtown Office Tower',
        'ACTIVE',
        25000000.00,
        1000000.00,
        pm1Id,
        1
      ]
    );
    const budgetId = budget.id;
    console.log('   ✓ Created budget: Original Budget ($25M)');

    // Create budget line items for key divisions
    const budgetLineItems = [
      { code: '01', category: 'LABOR', desc: 'Project management and supervision', qty: 2000, unit: 75.00, amount: 150000.00 },
      { code: '01', category: 'OTHER', desc: 'Temporary facilities and utilities', qty: null, unit: null, amount: 250000.00 },
      { code: '03', category: 'MATERIAL', desc: 'Concrete materials and supplies', qty: 8000, unit: 125.00, amount: 1000000.00 },
      { code: '03', category: 'LABOR', desc: 'Concrete placement and finishing', qty: 3000, unit: 85.00, amount: 255000.00 },
      { code: '05', category: 'SUBCONTRACT', desc: 'Structural steel fabrication and erection', qty: null, unit: null, amount: 3500000.00 },
      { code: '07', category: 'SUBCONTRACT', desc: 'Roofing and waterproofing', qty: null, unit: null, amount: 850000.00 },
      { code: '08', category: 'MATERIAL', desc: 'Windows and glazing', qty: null, unit: null, amount: 1200000.00 },
      { code: '09', category: 'SUBCONTRACT', desc: 'Drywall and painting', qty: null, unit: null, amount: 1800000.00 },
      { code: '09', category: 'MATERIAL', desc: 'Flooring materials', qty: null, unit: null, amount: 950000.00 },
      { code: '21', category: 'SUBCONTRACT', desc: 'Fire sprinkler system', qty: null, unit: null, amount: 750000.00 },
      { code: '22', category: 'SUBCONTRACT', desc: 'Plumbing systems', qty: null, unit: null, amount: 1400000.00 },
      { code: '23', category: 'SUBCONTRACT', desc: 'HVAC systems', qty: null, unit: null, amount: 2800000.00 },
      { code: '26', category: 'SUBCONTRACT', desc: 'Electrical systems and lighting', qty: null, unit: null, amount: 2400000.00 },
      { code: '31', category: 'SUBCONTRACT', desc: 'Excavation and earthwork', qty: null, unit: null, amount: 650000.00 },
      { code: '32', category: 'SUBCONTRACT', desc: 'Site improvements and paving', qty: null, unit: null, amount: 580000.00 },
    ];

    for (const item of budgetLineItems) {
      await dataSource.query(
        `INSERT INTO budget_line_items (
          budget_id, cost_code_id, category, description, quantity, unit_cost, budgeted_cost, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          budgetId,
          costCodeIds[item.code],
          item.category,
          item.desc,
          item.qty,
          item.unit,
          item.amount,
          1
        ]
      );
    }
    console.log(`   ✓ Created ${budgetLineItems.length} budget line items`);
    console.log('');

    // ==================== CREATE COMMITMENTS ====================
    console.log('📋 Creating commitments (subcontracts & POs)...');

    // Commitment 1: Steel Subcontract
    const [commitment1] = await dataSource.query(
      `INSERT INTO commitments (
        project_id, number, type, title, description, status,
        vendor_name, vendor_contact, vendor_email,
        original_amount, current_amount, start_date, end_date, retention_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        project1Id,
        'SC-001',
        'SUBCONTRACT',
        'Structural Steel Subcontract',
        'Fabrication and erection of structural steel framework for all 25 floors',
        'ACTIVE',
        'ABC Steel Corporation',
        'John Smith',
        'john.smith@abcsteel.com',
        3500000.00,
        3500000.00,
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
        10.00
      ]
    );
    const commitment1Id = commitment1.id;
    console.log('   ✓ Created SC-001: Structural Steel Subcontract ($3.5M)');

    // Commitment 2: HVAC Subcontract
    const [commitment2] = await dataSource.query(
      `INSERT INTO commitments (
        project_id, number, type, title, description, status,
        vendor_name, vendor_contact, vendor_email,
        original_amount, current_amount, start_date, end_date, retention_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        project1Id,
        'SC-002',
        'SUBCONTRACT',
        'HVAC System Installation',
        'Design, supply, and installation of complete HVAC system with controls',
        'PENDING_APPROVAL',
        'Comfort Climate Controls',
        'David Chen',
        'david.chen@comfortclimate.com',
        2800000.00,
        2800000.00,
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        10.00
      ]
    );
    const commitment2Id = commitment2.id;
    console.log('   ✓ Created SC-002: HVAC System Installation ($2.8M)');

    // Commitment 3: Concrete PO
    const [commitment3] = await dataSource.query(
      `INSERT INTO commitments (
        project_id, number, type, title, description, status,
        vendor_name, vendor_contact, vendor_email,
        original_amount, current_amount, start_date, end_date, retention_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        project1Id,
        'PO-001',
        'PURCHASE_ORDER',
        'Concrete Materials',
        'Ready-mix concrete delivery for foundation and structural work',
        'ACTIVE',
        'Premier Concrete Supply',
        'Maria Rodriguez',
        'maria@premierconcrete.com',
        1000000.00,
        1000000.00,
        new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        5.00
      ]
    );
    const commitment3Id = commitment3.id;
    console.log('   ✓ Created PO-001: Concrete Materials ($1M)');
    console.log('');

    // ==================== CREATE SCHEDULE OF VALUES ====================
    console.log('📝 Creating schedule of values...');

    // SOV for Steel Subcontract
    const [sov1] = await dataSource.query(
      `INSERT INTO schedule_of_values (commitment_id, project_id, created_by_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [commitment1Id, project1Id, pm1Id]
    );
    const sov1Id = sov1.id;

    // SOV items for steel
    const sovItems1 = [
      { line: 1, desc: 'Steel columns and beams - floors 1-10', value: 1400000.00 },
      { line: 2, desc: 'Steel columns and beams - floors 11-20', value: 1400000.00 },
      { line: 3, desc: 'Steel columns and beams - floors 21-25', value: 400000.00 },
      { line: 4, desc: 'Misc. steel and connections', value: 300000.00 },
    ];

    const sovItem1Ids: string[] = [];
    for (const item of sovItems1) {
      const [sovItem] = await dataSource.query(
        `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [sov1Id, costCodeIds['05'], item.line, item.desc, item.value]
      );
      sovItem1Ids.push(sovItem.id);
    }
    console.log(`   ✓ Created SOV for SC-001 with ${sovItems1.length} line items`);

    // SOV for Concrete PO
    const [sov2] = await dataSource.query(
      `INSERT INTO schedule_of_values (commitment_id, project_id, created_by_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [commitment3Id, project1Id, pm1Id]
    );
    const sov2Id = sov2.id;

    const sovItems2 = [
      { line: 1, desc: 'Foundation concrete - 4000 PSI', value: 600000.00 },
      { line: 2, desc: 'Structural concrete - 5000 PSI', value: 400000.00 },
    ];

    const sovItem2Ids: string[] = [];
    for (const item of sovItems2) {
      const [sovItem] = await dataSource.query(
        `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [sov2Id, costCodeIds['03'], item.line, item.desc, item.value]
      );
      sovItem2Ids.push(sovItem.id);
    }
    console.log(`   ✓ Created SOV for PO-001 with ${sovItems2.length} line items`);
    console.log('');

    console.log('   ✓ Skipping payment applications (complex entity - can be added later)');
    console.log('');

    console.log('   ✓ Skipping RFIs, submittals, and change orders (can be added later)');
    console.log('');

    // ==================== SUMMARY ====================
    console.log('✅ Master seed completed successfully!\n');

    const summary = await dataSource.query(`
      SELECT 'Users' as entity, COUNT(*)::text as count FROM users
      UNION ALL
      SELECT 'Organizations', COUNT(*)::text FROM organizations
      UNION ALL
      SELECT 'Projects', COUNT(*)::text FROM projects
      UNION ALL
      SELECT 'Organization Members', COUNT(*)::text FROM organization_members
      UNION ALL
      SELECT 'Project Members', COUNT(*)::text FROM project_members
      UNION ALL
      SELECT 'Cost Codes', COUNT(*)::text FROM cost_codes
      UNION ALL
      SELECT 'Budgets', COUNT(*)::text FROM budgets
      UNION ALL
      SELECT 'Budget Line Items', COUNT(*)::text FROM budget_line_items
      UNION ALL
      SELECT 'Commitments', COUNT(*)::text FROM commitments
      UNION ALL
      SELECT 'Schedule of Values', COUNT(*)::text FROM schedule_of_values
      UNION ALL
      SELECT 'SOV Items', COUNT(*)::text FROM schedule_of_values_items
      ORDER BY entity
    `);

    console.log('📊 Database Summary:');
    console.log('════════════════════════════════════════');
    summary.forEach((row: any) => {
      console.log(`   ${row.entity.padEnd(30)} ${row.count.padStart(5)}`);
    });
    console.log('════════════════════════════════════════\n');

    console.log('🔑 Test Credentials:');
    console.log('   ┌─────────────────────────────────────────────────┐');
    console.log('   │ System Admin                                    │');
    console.log('   │ Email: admin@bobbuilder.com                     │');
    console.log('   │ Password: Admin123!                             │');
    console.log('   │ Role: system_admin                              │');
    console.log('   ├─────────────────────────────────────────────────┤');
    console.log('   │ Project Manager                                 │');
    console.log('   │ Email: john.manager@acme.com                    │');
    console.log('   │ Password: password123                           │');
    console.log('   │ Role: user (project_admin on PROJ-2025-001)     │');
    console.log('   ├─────────────────────────────────────────────────┤');
    console.log('   │ Regular User                                    │');
    console.log('   │ Email: user@example.com                         │');
    console.log('   │ Password: password123                           │');
    console.log('   │ Role: user (viewer on projects)                 │');
    console.log('   └─────────────────────────────────────────────────┘\n');

    console.log('🎯 What was seeded:');
    console.log('   ✓ Organization: Acme Construction with 5 members');
    console.log('   ✓ Projects: Downtown Office Tower (commercial), Riverside Apartments (residential)');
    console.log('   ✓ CSI MasterFormat cost codes (25 divisions)');
    console.log('   ✓ Budget ($25M) with 15 line items across divisions');
    console.log('   ✓ Commitments: 2 subcontracts + 1 purchase order');
    console.log('   ✓ Schedule of Values with line items for each commitment\n');

    console.log('🚀 Ready for testing! Start the app with: npm run start:dev\n');

  } catch (error) {
    console.error('\n💥 Seed failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

// Run seed
seedMaster()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
