import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Create DataSource
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

    // ==================== CREATE USERS ====================
    console.log('👤 Creating users...');
    const passwordHash = await bcrypt.hash('password123', 12);

    // Check and create admin user
    const existingAdmin = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@example.com']
    );

    let adminId: string;
    if (existingAdmin.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO users (email, password, first_name, last_name, system_role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['admin@example.com', passwordHash, 'Admin', 'User', 'system_admin']
      );
      adminId = result[0].id;
      console.log('   ✓ Created admin@example.com');
    } else {
      adminId = existingAdmin[0].id;
      console.log('   ✓ Admin user already exists');
    }

    // Check and create regular user
    const existingUser = await dataSource.query(
      `SELECT id FROM users WHERE email = $1`,
      ['user@example.com']
    );

    let userId: string;
    if (existingUser.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO users (email, password, first_name, last_name, system_role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['user@example.com', passwordHash, 'Regular', 'User', 'user']
      );
      userId = result[0].id;
      console.log('   ✓ Created user@example.com');
    } else {
      userId = existingUser[0].id;
      console.log('   ✓ Regular user already exists');
    }

    console.log('');

    // ==================== CREATE ORGANIZATION ====================
    console.log('🏢 Creating organization...');

    const existingOrg = await dataSource.query(
      `SELECT id FROM organizations WHERE slug = $1`,
      ['test-organization']
    );

    let orgId: string;
    if (existingOrg.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         RETURNING id`,
        ['Test Organization', 'test-organization']
      );
      orgId = result[0].id;
      console.log('   ✓ Created Test Organization');
    } else {
      orgId = existingOrg[0].id;
      console.log('   ✓ Test Organization already exists');
    }

    // Add admin as organization owner
    const existingOrgMember = await dataSource.query(
      `SELECT 1 FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, adminId]
    );

    if (existingOrgMember.length === 0) {
      await dataSource.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [orgId, adminId, 'owner']
      );
      console.log('   ✓ Added admin as organization owner');
    } else {
      console.log('   ✓ Admin already member of organization');
    }

    console.log('');

    // ==================== CREATE PROJECTS ====================
    console.log('📁 Creating projects...');

    // Project 1: Commercial Office Building
    const existingProject1 = await dataSource.query(
      `SELECT id FROM projects WHERE number = $1 AND organization_id = $2`,
      ['PROJ-2025-001', orgId]
    );

    let project1Id: string;
    if (existingProject1.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO projects (
          number, name, organization_id, type, status,
          description, start_date, end_date,
          original_contract, current_contract, percent_complete,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'PROJ-2025-001',
          'Downtown Office Tower',
          orgId,
          'commercial',
          'construction',
          'A 25-story mixed-use office tower in downtown with retail space on ground floor',
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days from now
          15000000.00,
          15250000.00,
          35.5,
          adminId
        ]
      );
      project1Id = result[0].id;
      console.log('   ✓ Created Downtown Office Tower (PROJ-2025-001)');
    } else {
      project1Id = existingProject1[0].id;
      console.log('   ✓ Downtown Office Tower already exists');
    }

    // Add admin as project admin for Project 1
    const existingProjMember1 = await dataSource.query(
      `SELECT 1 FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [project1Id, adminId]
    );

    if (existingProjMember1.length === 0) {
      await dataSource.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [project1Id, adminId, 'project_admin', new Date()]
      );
      console.log('   ✓ Added admin to Downtown Office Tower');
    }

    // Project 2: Residential Development
    const existingProject2 = await dataSource.query(
      `SELECT id FROM projects WHERE number = $1 AND organization_id = $2`,
      ['PROJ-2025-002', orgId]
    );

    let project2Id: string;
    if (existingProject2.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO projects (
          number, name, organization_id, type, status,
          description, start_date, end_date,
          original_contract, current_contract, percent_complete,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'PROJ-2025-002',
          'Riverside Apartments',
          orgId,
          'residential',
          'preconstruction',
          '120-unit luxury apartment complex with amenities and parking',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 540 days from now
          8500000.00,
          8500000.00,
          5.0,
          adminId
        ]
      );
      project2Id = result[0].id;
      console.log('   ✓ Created Riverside Apartments (PROJ-2025-002)');
    } else {
      project2Id = existingProject2[0].id;
      console.log('   ✓ Riverside Apartments already exists');
    }

    // Add admin as project admin for Project 2
    const existingProjMember2 = await dataSource.query(
      `SELECT 1 FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [project2Id, adminId]
    );

    if (existingProjMember2.length === 0) {
      await dataSource.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [project2Id, adminId, 'project_admin', new Date()]
      );
      console.log('   ✓ Added admin to Riverside Apartments');
    }

    // Project 3: Infrastructure Project
    const existingProject3 = await dataSource.query(
      `SELECT id FROM projects WHERE number = $1 AND organization_id = $2`,
      ['PROJ-2025-003', orgId]
    );

    let project3Id: string;
    if (existingProject3.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO projects (
          number, name, organization_id, type, status,
          description, start_date, end_date,
          original_contract, current_contract, percent_complete,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          'PROJ-2025-003',
          'Highway Bridge Expansion',
          orgId,
          'infrastructure',
          'bidding',
          'Expansion and renovation of existing highway bridge structure',
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          new Date(Date.now() + 720 * 24 * 60 * 60 * 1000), // 720 days from now
          22000000.00,
          22000000.00,
          0.0,
          adminId
        ]
      );
      project3Id = result[0].id;
      console.log('   ✓ Created Highway Bridge Expansion (PROJ-2025-003)');
    } else {
      project3Id = existingProject3[0].id;
      console.log('   ✓ Highway Bridge Expansion already exists');
    }

    // Add admin as project admin for Project 3
    const existingProjMember3 = await dataSource.query(
      `SELECT 1 FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [project3Id, adminId]
    );

    if (existingProjMember3.length === 0) {
      await dataSource.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [project3Id, adminId, 'project_manager', new Date()]
      );
      console.log('   ✓ Added admin to Highway Bridge Expansion');
    }

    // Add regular user to Project 1 as viewer
    const existingUserProjMember = await dataSource.query(
      `SELECT 1 FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [project1Id, userId]
    );

    if (existingUserProjMember.length === 0) {
      await dataSource.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [project1Id, userId, 'viewer', new Date()]
      );
      console.log('   ✓ Added regular user to Downtown Office Tower as viewer');
    }

    console.log('');

    // ==================== CREATE COST CODES ====================
    console.log('💰 Creating cost codes...');

    // Division 01 - General Requirements
    const existingDiv01 = await dataSource.query(
      `SELECT id FROM cost_codes WHERE code = $1 AND project_id = $2`,
      ['01', project1Id]
    );

    let div01Id: string;
    if (existingDiv01.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO cost_codes (project_id, code, name, description, full_code, division, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          project1Id,
          '01',
          'General Requirements',
          'Administrative and temporary facilities',
          '01',
          1,
          1
        ]
      );
      div01Id = result[0].id;
      console.log('   ✓ Created cost code 01 - General Requirements');
    } else {
      div01Id = existingDiv01[0].id;
      console.log('   ✓ Cost code 01 already exists');
    }

    // Division 03 - Concrete
    const existingDiv03 = await dataSource.query(
      `SELECT id FROM cost_codes WHERE code = $1 AND project_id = $2`,
      ['03', project1Id]
    );

    let div03Id: string;
    if (existingDiv03.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO cost_codes (project_id, code, name, description, full_code, division, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          project1Id,
          '03',
          'Concrete',
          'Concrete work including formwork, reinforcement, and placement',
          '03',
          3,
          2
        ]
      );
      div03Id = result[0].id;
      console.log('   ✓ Created cost code 03 - Concrete');
    } else {
      div03Id = existingDiv03[0].id;
      console.log('   ✓ Cost code 03 already exists');
    }

    // Division 05 - Metals
    const existingDiv05 = await dataSource.query(
      `SELECT id FROM cost_codes WHERE code = $1 AND project_id = $2`,
      ['05', project1Id]
    );

    let div05Id: string;
    if (existingDiv05.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO cost_codes (project_id, code, name, description, full_code, division, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          project1Id,
          '05',
          'Metals',
          'Structural steel and metal fabrication',
          '05',
          5,
          3
        ]
      );
      div05Id = result[0].id;
      console.log('   ✓ Created cost code 05 - Metals');
    } else {
      div05Id = existingDiv05[0].id;
      console.log('   ✓ Cost code 05 already exists');
    }

    // Division 09 - Finishes
    const existingDiv09 = await dataSource.query(
      `SELECT id FROM cost_codes WHERE code = $1 AND project_id = $2`,
      ['09', project1Id]
    );

    let div09Id: string;
    if (existingDiv09.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO cost_codes (project_id, code, name, description, full_code, division, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          project1Id,
          '09',
          'Finishes',
          'Interior finishes including drywall, flooring, and painting',
          '09',
          9,
          4
        ]
      );
      div09Id = result[0].id;
      console.log('   ✓ Created cost code 09 - Finishes');
    } else {
      div09Id = existingDiv09[0].id;
      console.log('   ✓ Cost code 09 already exists');
    }

    console.log('');

    // ==================== CREATE BUDGETS ====================
    console.log('📊 Creating budgets...');

    const existingBudget = await dataSource.query(
      `SELECT id FROM budgets WHERE name = $1 AND project_id = $2`,
      ['Original Budget', project1Id]
    );

    let budgetId: string;
    if (existingBudget.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO budgets (project_id, name, description, status, total_budget, contingency, created_by_id, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          project1Id,
          'Original Budget',
          'Initial project budget for Downtown Office Tower',
          'ACTIVE',
          15000000.00,
          500000.00,
          adminId,
          1
        ]
      );
      budgetId = result[0].id;
      console.log('   ✓ Created Original Budget for Downtown Office Tower');
    } else {
      budgetId = existingBudget[0].id;
      console.log('   ✓ Original Budget already exists');
    }

    // ==================== CREATE BUDGET LINE ITEMS ====================
    console.log('📝 Creating budget line items...');

    // Line item 1: General Requirements - Labor
    const existingLineItem1 = await dataSource.query(
      `SELECT id FROM budget_line_items WHERE budget_id = $1 AND cost_code_id = $2 AND category = $3`,
      [budgetId, div01Id, 'LABOR']
    );

    if (existingLineItem1.length === 0) {
      await dataSource.query(
        `INSERT INTO budget_line_items (budget_id, cost_code_id, category, description, quantity, unit_cost, budgeted_cost, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          budgetId,
          div01Id,
          'LABOR',
          'Project management and supervision',
          1000,
          75.00,
          75000.00,
          1
        ]
      );
      console.log('   ✓ Created line item: General Requirements - Labor');
    }

    // Line item 2: Concrete - Material
    const existingLineItem2 = await dataSource.query(
      `SELECT id FROM budget_line_items WHERE budget_id = $1 AND cost_code_id = $2 AND category = $3`,
      [budgetId, div03Id, 'MATERIAL']
    );

    if (existingLineItem2.length === 0) {
      await dataSource.query(
        `INSERT INTO budget_line_items (budget_id, cost_code_id, category, description, quantity, unit_cost, budgeted_cost, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          budgetId,
          div03Id,
          'MATERIAL',
          'Concrete materials and supplies',
          5000,
          125.00,
          625000.00,
          1
        ]
      );
      console.log('   ✓ Created line item: Concrete - Material');
    }

    // Line item 3: Metals - Subcontract
    const existingLineItem3 = await dataSource.query(
      `SELECT id FROM budget_line_items WHERE budget_id = $1 AND cost_code_id = $2 AND category = $3`,
      [budgetId, div05Id, 'SUBCONTRACT']
    );

    if (existingLineItem3.length === 0) {
      await dataSource.query(
        `INSERT INTO budget_line_items (budget_id, cost_code_id, category, description, budgeted_cost, version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          budgetId,
          div05Id,
          'SUBCONTRACT',
          'Structural steel fabrication and erection',
          2500000.00,
          1
        ]
      );
      console.log('   ✓ Created line item: Metals - Subcontract');
    }

    // Line item 4: Finishes - Material
    const existingLineItem4 = await dataSource.query(
      `SELECT id FROM budget_line_items WHERE budget_id = $1 AND cost_code_id = $2 AND category = $3`,
      [budgetId, div09Id, 'MATERIAL']
    );

    if (existingLineItem4.length === 0) {
      await dataSource.query(
        `INSERT INTO budget_line_items (budget_id, cost_code_id, category, description, quantity, unit_cost, budgeted_cost, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          budgetId,
          div09Id,
          'MATERIAL',
          'Interior finish materials',
          75000,
          45.00,
          3375000.00,
          1
        ]
      );
      console.log('   ✓ Created line item: Finishes - Material');
    }

    console.log('');

    // ==================== CREATE COMMITMENTS ====================
    console.log('📋 Creating commitments...');

    // Commitment 1: Steel Subcontract
    const existingCommitment1 = await dataSource.query(
      `SELECT id FROM commitments WHERE number = $1 AND project_id = $2`,
      ['SC-001', project1Id]
    );

    if (existingCommitment1.length === 0) {
      await dataSource.query(
        `INSERT INTO commitments (
          project_id, number, type, title, description, status,
          vendor_name, vendor_contact, vendor_email,
          original_amount, current_amount, start_date, end_date,
          retention_percent
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          project1Id,
          'SC-001',
          'SUBCONTRACT',
          'Structural Steel Subcontract',
          'Fabrication and erection of structural steel framework',
          'ACTIVE',
          'ABC Steel Corporation',
          'John Smith',
          'john.smith@abcsteel.com',
          2500000.00,
          2500000.00,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
          10.00
        ]
      );
      console.log('   ✓ Created commitment SC-001: Structural Steel Subcontract');
    } else {
      console.log('   ✓ Commitment SC-001 already exists');
    }

    // Commitment 2: Concrete Purchase Order
    const existingCommitment2 = await dataSource.query(
      `SELECT id FROM commitments WHERE number = $1 AND project_id = $2`,
      ['PO-001', project1Id]
    );

    if (existingCommitment2.length === 0) {
      await dataSource.query(
        `INSERT INTO commitments (
          project_id, number, type, title, description, status,
          vendor_name, vendor_contact, vendor_email,
          original_amount, current_amount, start_date, end_date,
          retention_percent
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          project1Id,
          'PO-001',
          'PURCHASE_ORDER',
          'Concrete Materials Purchase Order',
          'Ready-mix concrete delivery for foundation and structural work',
          'ACTIVE',
          'Premier Concrete Supply',
          'Maria Rodriguez',
          'maria@premierconcrete.com',
          625000.00,
          625000.00,
          new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          5.00
        ]
      );
      console.log('   ✓ Created commitment PO-001: Concrete Materials Purchase Order');
    } else {
      console.log('   ✓ Commitment PO-001 already exists');
    }

    // Commitment 3: HVAC Subcontract
    const existingCommitment3 = await dataSource.query(
      `SELECT id FROM commitments WHERE number = $1 AND project_id = $2`,
      ['SC-002', project1Id]
    );

    if (existingCommitment3.length === 0) {
      await dataSource.query(
        `INSERT INTO commitments (
          project_id, number, type, title, description, status,
          vendor_name, vendor_contact, vendor_email,
          original_amount, current_amount, start_date, end_date,
          retention_percent
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          project1Id,
          'SC-002',
          'SUBCONTRACT',
          'HVAC System Installation',
          'Design, supply, and installation of complete HVAC system',
          'PENDING_APPROVAL',
          'Comfort Climate Controls',
          'David Chen',
          'david.chen@comfortclimate.com',
          1850000.00,
          1850000.00,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 240 days from now
          10.00
        ]
      );
      console.log('   ✓ Created commitment SC-002: HVAC System Installation');
    } else {
      console.log('   ✓ Commitment SC-002 already exists');
    }

    console.log('');

    // ==================== CREATE BUDGET SNAPSHOTS ====================
    console.log('📸 Creating budget snapshots...');

    // First, get the complete budget data with line items for the snapshot
    const budgetData = await dataSource.query(
      `SELECT * FROM budgets WHERE id = $1`,
      [budgetId]
    );

    const lineItemsData = await dataSource.query(
      `SELECT bli.*, cc.code, cc.name as cost_code_name, cc.full_code
       FROM budget_line_items bli
       JOIN cost_codes cc ON bli.cost_code_id = cc.id
       WHERE bli.budget_id = $1
       ORDER BY cc.division, cc.sort_order`,
      [budgetId]
    );

    // Snapshot 1: Initial Budget (30 days ago)
    const existingSnapshot1 = await dataSource.query(
      `SELECT id FROM budget_snapshots WHERE budget_id = $1 AND name = $2`,
      [budgetId, 'Initial Budget - Project Kickoff']
    );

    if (existingSnapshot1.length === 0) {
      const snapshot1Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Calculate totals for the snapshot
      const totalBudgeted = lineItemsData.reduce((sum: number, item: any) =>
        sum + parseFloat(item.budgeted_cost), 0
      );

      const snapshotData = {
        budget: {
          id: budgetData[0].id,
          projectId: budgetData[0].project_id,
          name: budgetData[0].name,
          description: budgetData[0].description,
          status: budgetData[0].status,
          totalBudget: parseFloat(budgetData[0].total_budget),
          contingency: parseFloat(budgetData[0].contingency),
        },
        lineItems: lineItemsData.map((item: any) => ({
          id: item.id,
          budgetId: item.budget_id,
          costCodeId: item.cost_code_id,
          costCode: item.code,
          costCodeName: item.cost_code_name,
          fullCode: item.full_code,
          category: item.category,
          description: item.description,
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unitCost: item.unit_cost ? parseFloat(item.unit_cost) : null,
          budgetedCost: parseFloat(item.budgeted_cost),
          committedCost: parseFloat(item.committed_cost),
          actualCost: parseFloat(item.actual_cost),
        }))
      };

      await dataSource.query(
        `INSERT INTO budget_snapshots (
          budget_id, name, description, snapshot_data,
          original_amount, revised_amount, committed_cost, actual_cost,
          created_by_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          budgetId,
          'Initial Budget - Project Kickoff',
          'Baseline budget established at project kickoff',
          JSON.stringify(snapshotData),
          totalBudgeted,
          totalBudgeted,
          0,
          0,
          adminId,
          snapshot1Date
        ]
      );
      console.log('   ✓ Created snapshot: Initial Budget - Project Kickoff (30 days ago)');
    } else {
      console.log('   ✓ Snapshot "Initial Budget - Project Kickoff" already exists');
    }

    // Snapshot 2: After Steel Commitment (15 days ago)
    const existingSnapshot2 = await dataSource.query(
      `SELECT id FROM budget_snapshots WHERE budget_id = $1 AND name = $2`,
      [budgetId, 'After Steel Contract Award']
    );

    if (existingSnapshot2.length === 0) {
      const snapshot2Date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      const totalBudgeted = lineItemsData.reduce((sum: number, item: any) =>
        sum + parseFloat(item.budgeted_cost), 0
      );

      // Simulate committed cost from steel subcontract
      const committedCost = 2500000.00;

      const snapshotData = {
        budget: {
          id: budgetData[0].id,
          projectId: budgetData[0].project_id,
          name: budgetData[0].name,
          description: budgetData[0].description,
          status: budgetData[0].status,
          totalBudget: parseFloat(budgetData[0].total_budget),
          contingency: parseFloat(budgetData[0].contingency),
        },
        lineItems: lineItemsData.map((item: any) => ({
          id: item.id,
          budgetId: item.budget_id,
          costCodeId: item.cost_code_id,
          costCode: item.code,
          costCodeName: item.cost_code_name,
          fullCode: item.full_code,
          category: item.category,
          description: item.description,
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unitCost: item.unit_cost ? parseFloat(item.unit_cost) : null,
          budgetedCost: parseFloat(item.budgeted_cost),
          committedCost: item.category === 'SUBCONTRACT' ? committedCost : 0,
          actualCost: 0,
        }))
      };

      await dataSource.query(
        `INSERT INTO budget_snapshots (
          budget_id, name, description, snapshot_data,
          original_amount, revised_amount, committed_cost, actual_cost,
          created_by_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          budgetId,
          'After Steel Contract Award',
          'Budget snapshot after awarding structural steel subcontract',
          JSON.stringify(snapshotData),
          totalBudgeted,
          totalBudgeted,
          committedCost,
          0,
          adminId,
          snapshot2Date
        ]
      );
      console.log('   ✓ Created snapshot: After Steel Contract Award (15 days ago)');
    } else {
      console.log('   ✓ Snapshot "After Steel Contract Award" already exists');
    }

    // Snapshot 3: Current Month End (today)
    const existingSnapshot3 = await dataSource.query(
      `SELECT id FROM budget_snapshots WHERE budget_id = $1 AND name = $2`,
      [budgetId, 'Month End - December 2025']
    );

    if (existingSnapshot3.length === 0) {
      const totalBudgeted = lineItemsData.reduce((sum: number, item: any) =>
        sum + parseFloat(item.budgeted_cost), 0
      );

      // Simulate committed and actual costs
      const committedCost = 3125000.00; // Steel + Concrete PO
      const actualCost = 875000.00; // Some work completed

      const snapshotData = {
        budget: {
          id: budgetData[0].id,
          projectId: budgetData[0].project_id,
          name: budgetData[0].name,
          description: budgetData[0].description,
          status: budgetData[0].status,
          totalBudget: parseFloat(budgetData[0].total_budget),
          contingency: parseFloat(budgetData[0].contingency),
        },
        lineItems: lineItemsData.map((item: any) => {
          let itemCommitted = 0;
          let itemActual = 0;

          if (item.category === 'SUBCONTRACT') {
            itemCommitted = 2500000.00; // Steel
            itemActual = 625000.00; // 25% complete
          } else if (item.category === 'MATERIAL' && item.code === '03') {
            itemCommitted = 625000.00; // Concrete PO
            itemActual = 250000.00; // 40% delivered
          }

          return {
            id: item.id,
            budgetId: item.budget_id,
            costCodeId: item.cost_code_id,
            costCode: item.code,
            costCodeName: item.cost_code_name,
            fullCode: item.full_code,
            category: item.category,
            description: item.description,
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            unitCost: item.unit_cost ? parseFloat(item.unit_cost) : null,
            budgetedCost: parseFloat(item.budgeted_cost),
            committedCost: itemCommitted,
            actualCost: itemActual,
          };
        })
      };

      await dataSource.query(
        `INSERT INTO budget_snapshots (
          budget_id, name, description, snapshot_data,
          original_amount, revised_amount, committed_cost, actual_cost,
          created_by_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          budgetId,
          'Month End - December 2025',
          'End of month budget snapshot showing current progress',
          JSON.stringify(snapshotData),
          totalBudgeted,
          totalBudgeted,
          committedCost,
          actualCost,
          adminId,
          new Date()
        ]
      );
      console.log('   ✓ Created snapshot: Month End - December 2025 (today)');
    } else {
      console.log('   ✓ Snapshot "Month End - December 2025" already exists');
    }

    console.log('');

    // ==================== CREATE SCHEDULE OF VALUES ====================
    console.log('📋 Creating Schedule of Values...');

    // Get commitment IDs
    const commitment1Data = await dataSource.query(
      `SELECT id FROM commitments WHERE number = $1 AND project_id = $2`,
      ['SC-001', project1Id]
    );
    const commitment1Id = commitment1Data[0]?.id;

    const commitment2Data = await dataSource.query(
      `SELECT id FROM commitments WHERE number = $1 AND project_id = $2`,
      ['PO-001', project1Id]
    );
    const commitment2Id = commitment2Data[0]?.id;

    let sov1Id: string | null = null;
    let sov2Id: string | null = null;

    // SOV 1: For SC-001 (Steel Subcontract)
    if (commitment1Id) {
      const existingSOV1 = await dataSource.query(
        `SELECT id FROM schedule_of_values WHERE commitment_id = $1`,
        [commitment1Id]
      );

      if (existingSOV1.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values (commitment_id, project_id, created_by_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [commitment1Id, project1Id, adminId]
        );
        sov1Id = result[0].id;
        console.log('   ✓ Created SOV for SC-001: Structural Steel Subcontract');
      } else {
        sov1Id = existingSOV1[0].id;
        console.log('   ✓ SOV for SC-001 already exists');
      }
    }

    // SOV 2: For PO-001 (Concrete Purchase Order)
    if (commitment2Id) {
      const existingSOV2 = await dataSource.query(
        `SELECT id FROM schedule_of_values WHERE commitment_id = $1`,
        [commitment2Id]
      );

      if (existingSOV2.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values (commitment_id, project_id, created_by_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [commitment2Id, project1Id, adminId]
        );
        sov2Id = result[0].id;
        console.log('   ✓ Created SOV for PO-001: Concrete Materials Purchase Order');
      } else {
        sov2Id = existingSOV2[0].id;
        console.log('   ✓ SOV for PO-001 already exists');
      }
    }

    console.log('');

    // ==================== CREATE SOV ITEMS ====================
    console.log('📝 Creating SOV items...');

    // SOV Items for SC-001 (Steel Subcontract - $2,500,000)
    let sovItem1Id: string | null = null;
    let sovItem2Id: string | null = null;
    let sovItem3Id: string | null = null;

    if (sov1Id) {
      const existingSOVItem1 = await dataSource.query(
        `SELECT id FROM schedule_of_values_items WHERE sov_id = $1 AND line_number = $2`,
        [sov1Id, 1]
      );

      if (existingSOVItem1.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [sov1Id, div05Id, 1, 'Steel framing - columns and beams', 1500000.00]
        );
        sovItem1Id = result[0].id;
        console.log('   ✓ Created SOV item 1 for SC-001');
      } else {
        sovItem1Id = existingSOVItem1[0].id;
        console.log('   ✓ SOV item 1 for SC-001 already exists');
      }

      const existingSOVItem2 = await dataSource.query(
        `SELECT id FROM schedule_of_values_items WHERE sov_id = $1 AND line_number = $2`,
        [sov1Id, 2]
      );

      if (existingSOVItem2.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [sov1Id, div05Id, 2, 'Steel decking and accessories', 800000.00]
        );
        sovItem2Id = result[0].id;
        console.log('   ✓ Created SOV item 2 for SC-001');
      } else {
        sovItem2Id = existingSOVItem2[0].id;
        console.log('   ✓ SOV item 2 for SC-001 already exists');
      }

      const existingSOVItem3 = await dataSource.query(
        `SELECT id FROM schedule_of_values_items WHERE sov_id = $1 AND line_number = $2`,
        [sov1Id, 3]
      );

      if (existingSOVItem3.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [sov1Id, div05Id, 3, 'Misc. steel and connections', 200000.00]
        );
        sovItem3Id = result[0].id;
        console.log('   ✓ Created SOV item 3 for SC-001');
      } else {
        sovItem3Id = existingSOVItem3[0].id;
        console.log('   ✓ SOV item 3 for SC-001 already exists');
      }
    }

    // SOV Items for PO-001 (Concrete - $625,000)
    let sovItem4Id: string | null = null;
    let sovItem5Id: string | null = null;

    if (sov2Id) {
      const existingSOVItem4 = await dataSource.query(
        `SELECT id FROM schedule_of_values_items WHERE sov_id = $1 AND line_number = $2`,
        [sov2Id, 1]
      );

      if (existingSOVItem4.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [sov2Id, div03Id, 1, 'Foundation concrete - 4000 PSI', 375000.00]
        );
        sovItem4Id = result[0].id;
        console.log('   ✓ Created SOV item 1 for PO-001');
      } else {
        sovItem4Id = existingSOVItem4[0].id;
        console.log('   ✓ SOV item 1 for PO-001 already exists');
      }

      const existingSOVItem5 = await dataSource.query(
        `SELECT id FROM schedule_of_values_items WHERE sov_id = $1 AND line_number = $2`,
        [sov2Id, 2]
      );

      if (existingSOVItem5.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO schedule_of_values_items (sov_id, cost_code_id, line_number, description, scheduled_value)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [sov2Id, div03Id, 2, 'Structural concrete - 5000 PSI', 250000.00]
        );
        sovItem5Id = result[0].id;
        console.log('   ✓ Created SOV item 2 for PO-001');
      } else {
        sovItem5Id = existingSOVItem5[0].id;
        console.log('   ✓ SOV item 2 for PO-001 already exists');
      }
    }

    console.log('');

    // ==================== CREATE PAYMENT APPLICATIONS ====================
    console.log('💰 Creating payment applications...');

    let payApp1Id: string | null = null;
    let payApp2Id: string | null = null;
    let payApp3Id: string | null = null;

    // Payment App 1: SC-001, Application #1 (APPROVED)
    if (sov1Id && commitment1Id) {
      const existingPayApp1 = await dataSource.query(
        `SELECT id FROM payment_applications WHERE commitment_id = $1 AND application_number = $2`,
        [commitment1Id, 1]
      );

      if (existingPayApp1.length === 0) {
        // Calculate totals
        const totalCompleted = 750000.00; // 30% of $2,500,000
        const retainagePercent = 10.00;
        const retainageAmount = totalCompleted * (retainagePercent / 100); // $75,000
        const totalEarnedLessRetainage = totalCompleted - retainageAmount; // $675,000
        const previousPayments = 0.00;
        const currentPaymentDue = totalEarnedLessRetainage - previousPayments; // $675,000

        const result = await dataSource.query(
          `INSERT INTO payment_applications (
            commitment_id, sov_id, project_id, application_number,
            application_date, period_start, period_end, status,
            total_completed_and_stored, retainage_percent, retainage_amount,
            total_earned_less_retainage, previous_payments, current_payment_due,
            submitted_by_id, submitted_at, reviewed_by_id, reviewed_at,
            approved_by_id, approved_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id`,
          [
            commitment1Id,
            sov1Id,
            project1Id,
            1,
            new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
            new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
            new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
            'APPROVED',
            totalCompleted,
            retainagePercent,
            retainageAmount,
            totalEarnedLessRetainage,
            previousPayments,
            currentPaymentDue,
            adminId,
            new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 days ago
            adminId,
            new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
            adminId,
            new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)  // 15 days ago
          ]
        );
        payApp1Id = result[0].id;
        console.log('   ✓ Created payment app #1 for SC-001 (APPROVED)');
      } else {
        payApp1Id = existingPayApp1[0].id;
        console.log('   ✓ Payment app #1 for SC-001 already exists');
      }
    }

    // Payment App 2: SC-001, Application #2 (SUBMITTED)
    if (sov1Id && commitment1Id) {
      const existingPayApp2 = await dataSource.query(
        `SELECT id FROM payment_applications WHERE commitment_id = $1 AND application_number = $2`,
        [commitment1Id, 2]
      );

      if (existingPayApp2.length === 0) {
        // Calculate totals for period 2
        const totalCompleted = 1250000.00; // 50% of $2,500,000 (cumulative)
        const retainagePercent = 10.00;
        const retainageAmount = totalCompleted * (retainagePercent / 100); // $125,000
        const totalEarnedLessRetainage = totalCompleted - retainageAmount; // $1,125,000
        const previousPayments = 675000.00; // From app #1
        const currentPaymentDue = totalEarnedLessRetainage - previousPayments; // $450,000

        const result = await dataSource.query(
          `INSERT INTO payment_applications (
            commitment_id, sov_id, project_id, application_number,
            application_date, period_start, period_end, status,
            total_completed_and_stored, retainage_percent, retainage_amount,
            total_earned_less_retainage, previous_payments, current_payment_due,
            submitted_by_id, submitted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id`,
          [
            commitment1Id,
            sov1Id,
            project1Id,
            2,
            new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
            new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            'SUBMITTED',
            totalCompleted,
            retainagePercent,
            retainageAmount,
            totalEarnedLessRetainage,
            previousPayments,
            currentPaymentDue,
            adminId,
            new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
          ]
        );
        payApp2Id = result[0].id;
        console.log('   ✓ Created payment app #2 for SC-001 (SUBMITTED)');
      } else {
        payApp2Id = existingPayApp2[0].id;
        console.log('   ✓ Payment app #2 for SC-001 already exists');
      }
    }

    // Payment App 3: PO-001, Application #1 (DRAFT)
    if (sov2Id && commitment2Id) {
      const existingPayApp3 = await dataSource.query(
        `SELECT id FROM payment_applications WHERE commitment_id = $1 AND application_number = $2`,
        [commitment2Id, 1]
      );

      if (existingPayApp3.length === 0) {
        // Calculate totals
        const totalCompleted = 250000.00; // 40% of $625,000
        const retainagePercent = 5.00;
        const retainageAmount = totalCompleted * (retainagePercent / 100); // $12,500
        const totalEarnedLessRetainage = totalCompleted - retainageAmount; // $237,500
        const previousPayments = 0.00;
        const currentPaymentDue = totalEarnedLessRetainage - previousPayments; // $237,500

        const result = await dataSource.query(
          `INSERT INTO payment_applications (
            commitment_id, sov_id, project_id, application_number,
            application_date, period_start, period_end, status,
            total_completed_and_stored, retainage_percent, retainage_amount,
            total_earned_less_retainage, previous_payments, current_payment_due
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            commitment2Id,
            sov2Id,
            project1Id,
            1,
            new Date(), // Today
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            new Date(), // Today
            'DRAFT',
            totalCompleted,
            retainagePercent,
            retainageAmount,
            totalEarnedLessRetainage,
            previousPayments,
            currentPaymentDue
          ]
        );
        payApp3Id = result[0].id;
        console.log('   ✓ Created payment app #1 for PO-001 (DRAFT)');
      } else {
        payApp3Id = existingPayApp3[0].id;
        console.log('   ✓ Payment app #1 for PO-001 already exists');
      }
    }

    console.log('');

    // ==================== CREATE PAYMENT APPLICATION ITEMS ====================
    console.log('📄 Creating payment application items...');

    // Items for Payment App 1 (SC-001, Application #1)
    if (payApp1Id && sovItem1Id && sovItem2Id && sovItem3Id) {
      // Item 1: Steel framing - 30% complete
      const existingPayAppItem1 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp1Id, 1]
      );

      if (existingPayAppItem1.length === 0) {
        const workCompleted = 450000.00; // 30% of $1,500,000
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp1Id,
            sovItem1Id,
            1,
            'Steel framing - columns and beams',
            1500000.00,
            450000.00,
            0.00,
            450000.00,
            0.00,
            450000.00,
            30.00,
            1050000.00
          ]
        );
        console.log('   ✓ Created pay app item 1 for SC-001 App #1');
      }

      // Item 2: Steel decking - 30% complete
      const existingPayAppItem2 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp1Id, 2]
      );

      if (existingPayAppItem2.length === 0) {
        const workCompleted = 240000.00; // 30% of $800,000
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp1Id,
            sovItem2Id,
            2,
            'Steel decking and accessories',
            800000.00,
            240000.00,
            0.00,
            240000.00,
            0.00,
            240000.00,
            30.00,
            560000.00
          ]
        );
        console.log('   ✓ Created pay app item 2 for SC-001 App #1');
      }

      // Item 3: Misc steel - 30% complete
      const existingPayAppItem3 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp1Id, 3]
      );

      if (existingPayAppItem3.length === 0) {
        const workCompleted = 60000.00; // 30% of $200,000
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp1Id,
            sovItem3Id,
            3,
            'Misc. steel and connections',
            200000.00,
            60000.00,
            0.00,
            60000.00,
            0.00,
            60000.00,
            30.00,
            140000.00
          ]
        );
        console.log('   ✓ Created pay app item 3 for SC-001 App #1');
      }
    }

    // Items for Payment App 2 (SC-001, Application #2) - showing cumulative progress
    if (payApp2Id && sovItem1Id && sovItem2Id && sovItem3Id) {
      // Item 1: Steel framing - 50% complete (cumulative)
      const existingPayAppItem4 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp2Id, 1]
      );

      if (existingPayAppItem4.length === 0) {
        const workThisPeriod = 300000.00; // Additional 20% of $1,500,000
        const totalWorkCompleted = 750000.00; // 50% cumulative
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp2Id,
            sovItem1Id,
            1,
            'Steel framing - columns and beams',
            1500000.00,
            workThisPeriod,
            0.00,
            totalWorkCompleted,
            0.00,
            totalWorkCompleted,
            50.00,
            750000.00
          ]
        );
        console.log('   ✓ Created pay app item 1 for SC-001 App #2');
      }

      // Item 2: Steel decking - 50% complete (cumulative)
      const existingPayAppItem5 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp2Id, 2]
      );

      if (existingPayAppItem5.length === 0) {
        const workThisPeriod = 160000.00; // Additional 20% of $800,000
        const totalWorkCompleted = 400000.00; // 50% cumulative
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp2Id,
            sovItem2Id,
            2,
            'Steel decking and accessories',
            800000.00,
            workThisPeriod,
            0.00,
            totalWorkCompleted,
            0.00,
            totalWorkCompleted,
            50.00,
            400000.00
          ]
        );
        console.log('   ✓ Created pay app item 2 for SC-001 App #2');
      }

      // Item 3: Misc steel - 50% complete (cumulative)
      const existingPayAppItem6 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp2Id, 3]
      );

      if (existingPayAppItem6.length === 0) {
        const workThisPeriod = 40000.00; // Additional 20% of $200,000
        const totalWorkCompleted = 100000.00; // 50% cumulative
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp2Id,
            sovItem3Id,
            3,
            'Misc. steel and connections',
            200000.00,
            workThisPeriod,
            0.00,
            totalWorkCompleted,
            0.00,
            totalWorkCompleted,
            50.00,
            100000.00
          ]
        );
        console.log('   ✓ Created pay app item 3 for SC-001 App #2');
      }
    }

    // Items for Payment App 3 (PO-001, Application #1) - DRAFT
    if (payApp3Id && sovItem4Id && sovItem5Id) {
      // Item 1: Foundation concrete - 40% complete
      const existingPayAppItem7 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp3Id, 1]
      );

      if (existingPayAppItem7.length === 0) {
        const workCompleted = 150000.00; // 40% of $375,000
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp3Id,
            sovItem4Id,
            1,
            'Foundation concrete - 4000 PSI',
            375000.00,
            150000.00,
            0.00,
            150000.00,
            0.00,
            150000.00,
            40.00,
            225000.00
          ]
        );
        console.log('   ✓ Created pay app item 1 for PO-001 App #1');
      }

      // Item 2: Structural concrete - 40% complete
      const existingPayAppItem8 = await dataSource.query(
        `SELECT id FROM payment_application_items WHERE payment_application_id = $1 AND line_number = $2`,
        [payApp3Id, 2]
      );

      if (existingPayAppItem8.length === 0) {
        const workCompleted = 100000.00; // 40% of $250,000
        await dataSource.query(
          `INSERT INTO payment_application_items (
            payment_application_id, sov_item_id, line_number, description, scheduled_value,
            work_completed_this_period, materials_stored_this_period,
            total_work_completed, total_materials_stored, total_completed_and_stored,
            percent_complete, balance_to_finish
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            payApp3Id,
            sovItem5Id,
            2,
            'Structural concrete - 5000 PSI',
            250000.00,
            100000.00,
            0.00,
            100000.00,
            0.00,
            100000.00,
            40.00,
            150000.00
          ]
        );
        console.log('   ✓ Created pay app item 2 for PO-001 App #1');
      }
    }

    console.log('');

    // ==================== CREATE LIEN WAIVERS ====================
    console.log('📜 Creating lien waivers...');

    // Lien Waiver 1: Conditional waiver for Payment App 1 (APPROVED)
    if (payApp1Id && commitment1Id) {
      const existingWaiver1 = await dataSource.query(
        `SELECT id FROM lien_waivers WHERE payment_application_id = $1 AND type = $2`,
        [payApp1Id, 'CONDITIONAL']
      );

      if (existingWaiver1.length === 0) {
        await dataSource.query(
          `INSERT INTO lien_waivers (
            payment_application_id, commitment_id, project_id, type, amount, through_date,
            document_url, file_name, file_size, mime_type,
            uploaded_by_id, uploaded_at, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            payApp1Id,
            commitment1Id,
            project1Id,
            'CONDITIONAL',
            675000.00, // Current payment due
            new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // Through date = application date
            '/storage/lien-waivers/sc-001-app-1-conditional.pdf',
            'SC-001_App01_Conditional_Waiver.pdf',
            245678,
            'application/pdf',
            adminId,
            new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Uploaded when approved
            'Conditional lien waiver for Payment Application #1'
          ]
        );
        console.log('   ✓ Created conditional lien waiver for SC-001 App #1');
      } else {
        console.log('   ✓ Conditional lien waiver for SC-001 App #1 already exists');
      }
    }

    // Lien Waiver 2: Conditional waiver for Payment App 2 (SUBMITTED - pending)
    if (payApp2Id && commitment1Id) {
      const existingWaiver2 = await dataSource.query(
        `SELECT id FROM lien_waivers WHERE payment_application_id = $1 AND type = $2`,
        [payApp2Id, 'CONDITIONAL']
      );

      if (existingWaiver2.length === 0) {
        await dataSource.query(
          `INSERT INTO lien_waivers (
            payment_application_id, commitment_id, project_id, type, amount, through_date,
            document_url, file_name, file_size, mime_type,
            uploaded_by_id, uploaded_at, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            payApp2Id,
            commitment1Id,
            project1Id,
            'CONDITIONAL',
            450000.00, // Current payment due
            new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Through date = application date
            '/storage/lien-waivers/sc-001-app-2-conditional.pdf',
            'SC-001_App02_Conditional_Waiver.pdf',
            248912,
            'application/pdf',
            adminId,
            new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Uploaded with submission
            'Conditional lien waiver for Payment Application #2'
          ]
        );
        console.log('   ✓ Created conditional lien waiver for SC-001 App #2');
      } else {
        console.log('   ✓ Conditional lien waiver for SC-001 App #2 already exists');
      }
    }

    console.log('');

    // ==================== SUMMARY ====================
    console.log('✅ Seed completed successfully!\n');

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
      SELECT 'Budget Snapshots', COUNT(*)::text FROM budget_snapshots
      UNION ALL
      SELECT 'Commitments', COUNT(*)::text FROM commitments
      UNION ALL
      SELECT 'Schedule of Values', COUNT(*)::text FROM schedule_of_values
      UNION ALL
      SELECT 'SOV Items', COUNT(*)::text FROM schedule_of_values_items
      UNION ALL
      SELECT 'Payment Applications', COUNT(*)::text FROM payment_applications
      UNION ALL
      SELECT 'Payment App Items', COUNT(*)::text FROM payment_application_items
      UNION ALL
      SELECT 'Lien Waivers', COUNT(*)::text FROM lien_waivers
      ORDER BY entity
    `);

    console.log('📊 Database Summary:');
    summary.forEach((row: any) => {
      console.log(`   ${row.entity}: ${row.count}`);
    });

    console.log('\n🔑 Test Credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123');
    console.log('   Role: system_admin\n');
    console.log('   Email: user@example.com');
    console.log('   Password: password123');
    console.log('   Role: user\n');

  } catch (error) {
    console.error('💥 Seed failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run seed
seed();
