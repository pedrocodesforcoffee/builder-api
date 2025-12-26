import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationMember } from '../../modules/organizations/entities/organization-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { ProjectFolder } from '../../modules/projects/entities/project-folder.entity';
import { CostCode } from '../../modules/financials/entities/cost-code.entity';
import { Budget } from '../../modules/financials/entities/budget.entity';
import { BudgetLineItem } from '../../modules/financials/entities/budget-line-item.entity';
import { PrimeContract } from '../../modules/financials/entities/prime-contract.entity';
import { Commitment } from '../../modules/financials/entities/commitment.entity';
import { CommitmentItem } from '../../modules/financials/entities/commitment-item.entity';
import { PotentialChangeOrder } from '../../modules/financials/entities/potential-change-order.entity';
import { PcoCostTier } from '../../modules/financials/entities/pco-cost-tier.entity';
import { OwnerChangeOrder } from '../../modules/financials/entities/owner-change-order.entity';
import { OcoCostBreakdown } from '../../modules/financials/entities/oco-cost-breakdown.entity';
import { CommitmentChangeOrder } from '../../modules/financials/entities/commitment-change-order.entity';
import { CcoLineItem } from '../../modules/financials/entities/cco-line-item.entity';
import { CcoTmEntry } from '../../modules/financials/entities/cco-tm-entry.entity';
import { ChangeOrderPackage } from '../../modules/financials/entities/change-order-package.entity';
import { ChangeOrderPackageItem } from '../../modules/financials/entities/change-order-package-item.entity';
import { ChangeOrderHistory } from '../../modules/financials/entities/change-order-history.entity';
import { ChangeOrderDocument } from '../../modules/financials/entities/change-order-document.entity';
import { PcoStatus } from '../../modules/financials/enums/pco-status.enum';
import { OcoStatus } from '../../modules/financials/enums/oco-status.enum';
import { CcoStatus } from '../../modules/financials/enums/cco-status.enum';
import { CoPriority } from '../../modules/financials/enums/co-priority.enum';
import { OcoChangeType } from '../../modules/financials/enums/oco-change-type.enum';
import { CcoChangeType } from '../../modules/financials/enums/cco-change-type.enum';
import { CoPackageStatus } from '../../modules/financials/enums/co-package-status.enum';
import { CoAction } from '../../modules/financials/enums/co-action.enum';

/**
 * Change Order Management Seed Script
 *
 * Seeds the database with:
 * - Potential Change Orders (PCOs) in various statuses
 * - Owner Change Orders (OCOs) in various statuses
 * - Commitment Change Orders (CCOs) in various statuses
 * - Change Order Packages
 * - Cost breakdowns and line items
 * - History entries
 *
 * Prerequisites:
 * - Run seed.ts first to create users, organizations, and projects
 * - Run seed-csi-cost-codes.ts to create cost codes
 * - Run seed-commitments.ts to create commitments
 *
 * Usage:
 * npm run seed:change-orders
 */

async function seedChangeOrders() {
  console.log('🌱 Starting change order management seed...\n');

  // Load environment variables
  require('dotenv').config();

  // Database connection
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      User,
      Organization,
      OrganizationMember,
      Project,
      ProjectMember,
      ProjectFolder,
      CostCode,
      Budget,
      BudgetLineItem,
      PrimeContract,
      Commitment,
      CommitmentItem,
      PotentialChangeOrder,
      PcoCostTier,
      OwnerChangeOrder,
      OcoCostBreakdown,
      CommitmentChangeOrder,
      CcoLineItem,
      CcoTmEntry,
      ChangeOrderPackage,
      ChangeOrderPackageItem,
      ChangeOrderHistory,
      ChangeOrderDocument,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const projectRepo = dataSource.getRepository(Project);
  const primeContractRepo = dataSource.getRepository(PrimeContract);
  const costCodeRepo = dataSource.getRepository(CostCode);
  const commitmentRepo = dataSource.getRepository(Commitment);
  const userRepo = dataSource.getRepository(User);
  const pcoRepo = dataSource.getRepository(PotentialChangeOrder);
  const pcoCostTierRepo = dataSource.getRepository(PcoCostTier);
  const ocoRepo = dataSource.getRepository(OwnerChangeOrder);
  const ocoCostBreakdownRepo = dataSource.getRepository(OcoCostBreakdown);
  const ccoRepo = dataSource.getRepository(CommitmentChangeOrder);
  const ccoLineItemRepo = dataSource.getRepository(CcoLineItem);
  const packageRepo = dataSource.getRepository(ChangeOrderPackage);
  const packageItemRepo = dataSource.getRepository(ChangeOrderPackageItem);
  const historyRepo = dataSource.getRepository(ChangeOrderHistory);

  try {
    // Get first project
    const projects = await projectRepo.find({ take: 1 });
    if (projects.length === 0) {
      console.error('❌ No projects found. Please run seed.ts first.');
      process.exit(1);
    }
    const project = projects[0];
    console.log(`📋 Using project: ${project.name} (${project.id})\n`);

    // Get users first
    const users = await userRepo.find({ take: 3 });
    const user = users[0];
    const approver = users.length > 1 ? users[1] : users[0];

    // Get or create prime contract
    let primeContracts = await primeContractRepo.find({
      where: { projectId: project.id },
      take: 1,
    });

    let primeContract: PrimeContract;
    if (primeContracts.length === 0) {
      console.log('📄 Creating prime contract...');
      primeContract = primeContractRepo.create({
        projectId: project.id,
        number: 'PC-001',
        title: 'Prime Contract - Downtown Office Tower',
        description: 'Main construction contract for downtown office tower project',
        originalAmount: 5000000,
        currentAmount: 5125000,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-12-31'),
        retentionPercentage: 10,
      });
      primeContract = await primeContractRepo.save(primeContract);
      console.log(`✅ Created prime contract: ${primeContract.number}\n`);
    } else {
      primeContract = primeContracts[0];
      console.log(`📄 Using prime contract: ${primeContract.number}\n`);
    }

    // Get cost codes
    const costCodes = await costCodeRepo.find({
      where: { projectId: project.id },
      take: 10,
    });
    if (costCodes.length === 0) {
      console.error('❌ No cost codes found. Please run seed-csi-cost-codes.ts first.');
      process.exit(1);
    }
    console.log(`📊 Found ${costCodes.length} cost codes\n`);

    // Get commitments
    const commitments = await commitmentRepo.find({
      where: { projectId: project.id },
      take: 5,
    });
    if (commitments.length === 0) {
      console.error('❌ No commitments found. Please run seed-commitments.ts first.');
      process.exit(1);
    }
    console.log(`📝 Found ${commitments.length} commitments\n`);

    // Clear existing change orders
    console.log('🧹 Clearing existing change orders...');
    await dataSource.query('DELETE FROM pco_cost_tiers WHERE pco_id IN (SELECT id FROM potential_change_orders WHERE project_id = $1)', [project.id]);
    await dataSource.query('DELETE FROM potential_change_orders WHERE project_id = $1', [project.id]);
    await dataSource.query('DELETE FROM oco_cost_breakdowns WHERE oco_id IN (SELECT id FROM owner_change_orders WHERE project_id = $1)', [project.id]);
    await dataSource.query('DELETE FROM owner_change_orders WHERE project_id = $1', [project.id]);
    await dataSource.query('DELETE FROM cco_line_items WHERE cco_id IN (SELECT id FROM commitment_change_orders WHERE project_id = $1)', [project.id]);
    await dataSource.query('DELETE FROM commitment_change_orders WHERE project_id = $1', [project.id]);
    await dataSource.query('DELETE FROM change_order_package_items WHERE package_id IN (SELECT id FROM change_order_packages WHERE project_id = $1)', [project.id]);
    await dataSource.query('DELETE FROM change_order_packages WHERE project_id = $1', [project.id]);
    console.log('✅ Existing change orders cleared\n');

    // ========================================
    // SEED POTENTIAL CHANGE ORDERS (PCOs)
    // ========================================
    console.log('📝 Creating Potential Change Orders...\n');

    const pcos: PotentialChangeOrder[] = [];

    // PCO #1: DRAFT status
    const pco1 = pcoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoNumber: 'PCO-001',
      title: 'Additional Foundation Waterproofing',
      description: 'Add waterproofing membrane to foundation walls due to high groundwater table discovered during excavation',
      status: PcoStatus.DRAFT,
      priority: CoPriority.HIGH,
      directCost: 25000,
      overheadPercent: 10,
      overheadAmount: 2500,
      profitPercent: 15,
      profitAmount: 4125,
      contingencyPercent: 5,
      contingencyAmount: 1578.75,
      totalAmount: 33203.75,
      createdById: user.id,
    });
    pcos.push(await pcoRepo.save(pco1));

    // PCO #1 Cost Tiers
    await pcoCostTierRepo.save([
      pcoCostTierRepo.create({
        pcoId: pco1.id,
        costCodeId: costCodes[0]?.id,
        description: 'Waterproofing membrane material',
        quantity: 500,
        unit: 'SF',
        unitCost: 15,
        directCost: 7500,
        order: 1,
      }),
      pcoCostTierRepo.create({
        pcoId: pco1.id,
        costCodeId: costCodes[0]?.id,
        description: 'Labor for installation',
        quantity: 120,
        unit: 'HR',
        unitCost: 75,
        directCost: 9000,
        order: 2,
      }),
      pcoCostTierRepo.create({
        pcoId: pco1.id,
        description: 'Drainage board and protection layer',
        directCost: 8500,
        order: 3,
      }),
    ]);

    // PCO #2: SUBMITTED status
    const pco2 = pcoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoNumber: 'PCO-002',
      title: 'Upgrade HVAC System Capacity',
      description: 'Increase HVAC capacity from 20 tons to 25 tons per owner request for future tenant flexibility',
      status: PcoStatus.SUBMITTED,
      priority: CoPriority.MEDIUM,
      directCost: 45000,
      overheadPercent: 12,
      overheadAmount: 5400,
      profitPercent: 18,
      profitAmount: 9072,
      contingencyPercent: 3,
      contingencyAmount: 1784.16,
      totalAmount: 61256.16,
      submittedAt: new Date('2024-02-15T10:30:00Z'),
      createdById: user.id,
    });
    pcos.push(await pcoRepo.save(pco2));

    // PCO #2 Cost Tiers
    await pcoCostTierRepo.save([
      pcoCostTierRepo.create({
        pcoId: pco2.id,
        costCodeId: costCodes[2]?.id,
        description: 'Additional HVAC equipment (5 ton capacity increase)',
        quantity: 5,
        unit: 'TON',
        unitCost: 6000,
        directCost: 30000,
        order: 1,
      }),
      pcoCostTierRepo.create({
        pcoId: pco2.id,
        costCodeId: costCodes[2]?.id,
        description: 'Additional ductwork and distribution',
        directCost: 15000,
        order: 2,
      }),
    ]);

    // PCO #3: UNDER_REVIEW status
    const pco3 = pcoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoNumber: 'PCO-003',
      title: 'Add Emergency Generator System',
      description: 'Install 150kW standby generator with automatic transfer switch per code requirements',
      status: PcoStatus.UNDER_REVIEW,
      priority: CoPriority.CRITICAL,
      directCost: 75000,
      overheadPercent: 10,
      overheadAmount: 7500,
      profitPercent: 15,
      profitAmount: 12375,
      contingencyPercent: 5,
      contingencyAmount: 4743.75,
      totalAmount: 99618.75,
      submittedAt: new Date('2024-02-10T14:00:00Z'),
      createdById: user.id,
    });
    pcos.push(await pcoRepo.save(pco3));

    // PCO #4: APPROVED status
    const pco4 = pcoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoNumber: 'PCO-004',
      title: 'Revise Electrical Panel Layout',
      description: 'Relocate main electrical panels to new location per architect revision',
      status: PcoStatus.APPROVED,
      priority: CoPriority.HIGH,
      directCost: 18000,
      overheadPercent: 10,
      overheadAmount: 1800,
      profitPercent: 15,
      profitAmount: 2970,
      contingencyPercent: 5,
      contingencyAmount: 1138.50,
      totalAmount: 23908.50,
      submittedAt: new Date('2024-02-05T09:00:00Z'),
      approvedAt: new Date('2024-02-12T15:30:00Z'),
      createdById: user.id,
    });
    pcos.push(await pcoRepo.save(pco4));

    // PCO #5: REJECTED status
    const pco5 = pcoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoNumber: 'PCO-005',
      title: 'Upgrade Flooring to Marble',
      description: 'Replace specified ceramic tile with marble flooring in lobby areas',
      status: PcoStatus.REJECTED,
      priority: CoPriority.LOW,
      directCost: 95000,
      overheadPercent: 10,
      overheadAmount: 9500,
      profitPercent: 15,
      profitAmount: 15675,
      contingencyPercent: 5,
      contingencyAmount: 6008.75,
      totalAmount: 126183.75,
      submittedAt: new Date('2024-01-20T11:00:00Z'),
      rejectedAt: new Date('2024-01-25T16:00:00Z'),
      rejectionReason: 'Cost exceeds owner budget for this upgrade. Consider alternative materials.',
      createdById: user.id,
    });
    pcos.push(await pcoRepo.save(pco5));

    console.log(`✅ Created ${pcos.length} PCOs\n`);

    // ========================================
    // SEED OWNER CHANGE ORDERS (OCOs)
    // ========================================
    console.log('📝 Creating Owner Change Orders...\n');

    const ocos: OwnerChangeOrder[] = [];

    // OCO #1: DRAFT status
    const oco1 = ocoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      pcoId: pco4.id,
      ocoNumber: 'OCO-001',
      title: 'Electrical Panel Relocation (from PCO-004)',
      description: 'Approved change to relocate main electrical panels',
      status: OcoStatus.DRAFT,
      changeType: OcoChangeType.DESIGN_CHANGE,
      priority: CoPriority.HIGH,
      amount: 23908.50,
      reason: 'Architect revised plans to accommodate structural changes',
      scheduleImpactDays: 5,
      createdById: user.id,
    });
    ocos.push(await ocoRepo.save(oco1));

    // OCO #1 Cost Breakdown
    await ocoCostBreakdownRepo.save([
      ocoCostBreakdownRepo.create({
        ocoId: oco1.id,
        costCodeId: costCodes[4]?.id,
        description: 'Relocate electrical panels',
        amount: 12000,
        order: 1,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco1.id,
        costCodeId: costCodes[4]?.id,
        description: 'New conduit runs to relocated panels',
        amount: 6000,
        order: 2,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco1.id,
        description: 'Overhead, profit, and contingency',
        amount: 5908.50,
        order: 3,
      }),
    ]);

    // OCO #2: PENDING_APPROVAL status
    const oco2 = ocoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      ocoNumber: 'OCO-002',
      title: 'Add Roof Access Ladder and Hatch',
      description: 'Install permanent ladder and roof hatch for maintenance access',
      status: OcoStatus.PENDING_APPROVAL,
      changeType: OcoChangeType.SCOPE_CHANGE,
      priority: CoPriority.MEDIUM,
      amount: 8500,
      reason: 'Required by building inspector for code compliance',
      scheduleImpactDays: 2,
      submittedAt: new Date('2024-02-18T10:00:00Z'),
      createdById: user.id,
    });
    ocos.push(await ocoRepo.save(oco2));

    // OCO #2 Cost Breakdown
    await ocoCostBreakdownRepo.save([
      ocoCostBreakdownRepo.create({
        ocoId: oco2.id,
        costCodeId: costCodes[1]?.id,
        description: 'Roof hatch unit',
        amount: 3500,
        order: 1,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco2.id,
        costCodeId: costCodes[1]?.id,
        description: 'Ladder and safety cage',
        amount: 2800,
        order: 2,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco2.id,
        description: 'Installation labor',
        amount: 2200,
        order: 3,
      }),
    ]);

    // OCO #3: APPROVED status
    const oco3 = ocoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      ocoNumber: 'OCO-003',
      title: 'Increase Parking Lot Size',
      description: 'Expand parking lot from 50 spaces to 65 spaces per owner request',
      status: OcoStatus.APPROVED,
      changeType: OcoChangeType.OWNER_REQUEST,
      priority: CoPriority.MEDIUM,
      amount: 42500,
      reason: 'Owner anticipates higher tenant parking needs',
      scheduleImpactDays: 10,
      submittedAt: new Date('2024-02-01T09:00:00Z'),
      approvedAt: new Date('2024-02-08T14:00:00Z'),
      approvedById: approver.id,
      createdById: user.id,
    });
    ocos.push(await ocoRepo.save(oco3));

    // OCO #3 Cost Breakdown
    await ocoCostBreakdownRepo.save([
      ocoCostBreakdownRepo.create({
        ocoId: oco3.id,
        costCodeId: costCodes[6]?.id,
        description: 'Additional asphalt paving (15 spaces @ 2,500/space)',
        amount: 37500,
        order: 1,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco3.id,
        costCodeId: costCodes[6]?.id,
        description: 'Striping and signage',
        amount: 5000,
        order: 2,
      }),
    ]);

    // OCO #4: EXECUTED status
    const oco4 = ocoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      ocoNumber: 'OCO-004',
      title: 'Add Fire Sprinkler Coverage to Storage Area',
      description: 'Extend fire sprinkler system to include previously unprotected storage area',
      status: OcoStatus.EXECUTED,
      changeType: OcoChangeType.REGULATORY,
      priority: CoPriority.HIGH,
      amount: 15750,
      reason: 'Fire marshal requires sprinkler coverage for storage area',
      scheduleImpactDays: 3,
      submittedAt: new Date('2024-01-15T11:00:00Z'),
      approvedAt: new Date('2024-01-20T10:00:00Z'),
      approvedById: approver.id,
      executedAt: new Date('2024-01-25T16:00:00Z'),
      createdById: user.id,
    });
    ocos.push(await ocoRepo.save(oco4));

    // OCO #4 Cost Breakdown
    await ocoCostBreakdownRepo.save([
      ocoCostBreakdownRepo.create({
        ocoId: oco4.id,
        costCodeId: costCodes[7]?.id,
        description: 'Sprinkler heads and piping (800 SF coverage)',
        amount: 12000,
        order: 1,
      }),
      ocoCostBreakdownRepo.create({
        ocoId: oco4.id,
        costCodeId: costCodes[7]?.id,
        description: 'Testing and inspection',
        amount: 3750,
        order: 2,
      }),
    ]);

    // OCO #5: REJECTED status
    const oco5 = ocoRepo.create({
      projectId: project.id,
      primeContractId: primeContract.id,
      ocoNumber: 'OCO-005',
      title: 'Add Decorative Stone Facade',
      description: 'Replace standard brick facade with decorative stone on building front',
      status: OcoStatus.REJECTED,
      changeType: OcoChangeType.OWNER_REQUEST,
      priority: CoPriority.LOW,
      amount: 125000,
      reason: 'Owner aesthetic preference',
      scheduleImpactDays: 15,
      submittedAt: new Date('2024-02-05T13:00:00Z'),
      rejectedAt: new Date('2024-02-10T11:00:00Z'),
      rejectedById: approver.id,
      rejectionReason: 'Budget constraints. Consider value engineering alternatives.',
      createdById: user.id,
    });
    ocos.push(await ocoRepo.save(oco5));

    console.log(`✅ Created ${ocos.length} OCOs\n`);

    // ========================================
    // SEED COMMITMENT CHANGE ORDERS (CCOs)
    // ========================================
    console.log('📝 Creating Commitment Change Orders...\n');

    const ccos: CommitmentChangeOrder[] = [];

    // CCO #1: DRAFT status
    const cco1 = ccoRepo.create({
      projectId: project.id,
      commitmentId: commitments[0]?.id,
      ocoId: oco3.id,
      ccoNumber: 'CCO-001',
      title: 'Additional Concrete for Parking Lot Expansion',
      description: 'Increase concrete scope for expanded parking lot per OCO-003',
      status: CcoStatus.DRAFT,
      changeType: CcoChangeType.SCOPE_ADDITION,
      amount: 35000,
      isTimeAndMaterial: false,
      createdById: user.id,
    });
    ccos.push(await ccoRepo.save(cco1));

    // CCO #1 Line Items
    await ccoLineItemRepo.save([
      ccoLineItemRepo.create({
        ccoId: cco1.id,
        costCodeId: costCodes[0]?.id,
        description: 'Additional concrete paving (200 CY)',
        quantity: 200,
        unit: 'CY',
        unitCost: 150,
        amount: 30000,
        order: 1,
      }),
      ccoLineItemRepo.create({
        ccoId: cco1.id,
        costCodeId: costCodes[0]?.id,
        description: 'Additional rebar and forms',
        amount: 5000,
        order: 2,
      }),
    ]);

    // CCO #2: PENDING_APPROVAL status
    const cco2 = ccoRepo.create({
      projectId: project.id,
      commitmentId: commitments[1]?.id,
      ccoNumber: 'CCO-002',
      title: 'Additional HVAC Zones',
      description: 'Add 3 additional HVAC zones for better temperature control',
      status: CcoStatus.PENDING_APPROVAL,
      changeType: CcoChangeType.SCOPE_ADDITION,
      amount: 22000,
      isTimeAndMaterial: false,
      submittedAt: new Date('2024-02-16T09:00:00Z'),
      submittedById: user.id,
      createdById: user.id,
    });
    ccos.push(await ccoRepo.save(cco2));

    // CCO #2 Line Items
    await ccoLineItemRepo.save([
      ccoLineItemRepo.create({
        ccoId: cco2.id,
        costCodeId: costCodes[2]?.id,
        description: 'Zone control panels (3 units)',
        quantity: 3,
        unit: 'EA',
        unitCost: 4500,
        amount: 13500,
        order: 1,
      }),
      ccoLineItemRepo.create({
        ccoId: cco2.id,
        costCodeId: costCodes[2]?.id,
        description: 'Additional dampers and controls',
        amount: 8500,
        order: 2,
      }),
    ]);

    // CCO #3: APPROVED status
    const cco3 = ccoRepo.create({
      projectId: project.id,
      commitmentId: commitments[2]?.id,
      ccoNumber: 'CCO-003',
      title: 'Upgrade Electrical Panel Capacity',
      description: 'Increase panel capacity from 400A to 600A',
      status: CcoStatus.APPROVED,
      changeType: CcoChangeType.DESIGN_CHANGE,
      amount: 8750,
      isTimeAndMaterial: false,
      submittedAt: new Date('2024-02-08T10:00:00Z'),
      submittedById: user.id,
      approvedAt: new Date('2024-02-12T14:00:00Z'),
      approvedById: approver.id,
      createdById: user.id,
    });
    ccos.push(await ccoRepo.save(cco3));

    // CCO #4: EXECUTED status
    const cco4 = ccoRepo.create({
      projectId: project.id,
      commitmentId: commitments[0]?.id,
      ccoNumber: 'CCO-004',
      title: 'Foundation Wall Height Increase',
      description: 'Increase foundation wall height by 2 feet per structural engineer',
      status: CcoStatus.EXECUTED,
      changeType: CcoChangeType.UNFORESEEN_CONDITIONS,
      amount: 12500,
      isTimeAndMaterial: false,
      submittedAt: new Date('2024-01-25T11:00:00Z'),
      submittedById: user.id,
      approvedAt: new Date('2024-01-28T09:00:00Z'),
      approvedById: approver.id,
      executedAt: new Date('2024-02-05T15:00:00Z'),
      createdById: user.id,
    });
    ccos.push(await ccoRepo.save(cco4));

    // CCO #5: Time & Material CCO
    const cco5 = ccoRepo.create({
      projectId: project.id,
      commitmentId: commitments[1]?.id,
      ccoNumber: 'CCO-005',
      title: 'Additional Ductwork - Time & Material',
      description: 'Additional ductwork modifications billed T&M',
      status: CcoStatus.APPROVED,
      changeType: CcoChangeType.DESIGN_CHANGE,
      amount: 15200,
      isTimeAndMaterial: true,
      submittedAt: new Date('2024-02-10T13:00:00Z'),
      submittedById: user.id,
      approvedAt: new Date('2024-02-14T10:00:00Z'),
      approvedById: approver.id,
      createdById: user.id,
    });
    ccos.push(await ccoRepo.save(cco5));

    console.log(`✅ Created ${ccos.length} CCOs\n`);

    // ========================================
    // SEED CHANGE ORDER PACKAGES
    // ========================================
    console.log('📝 Creating Change Order Packages...\n');

    const packages: ChangeOrderPackage[] = [];

    // Package #1: DRAFT status
    const pkg1 = packageRepo.create({
      projectId: project.id,
      packageNumber: 'PKG-001',
      title: 'February 2024 Change Order Package',
      description: 'Monthly package for all pending change orders',
      status: CoPackageStatus.DRAFT,
      totalAmount: 0,
      createdById: user.id,
    });
    packages.push(await packageRepo.save(pkg1));

    // Package #1 Items
    await packageItemRepo.save([
      packageItemRepo.create({
        packageId: pkg1.id,
        ocoId: oco2.id,
        changeOrderType: 'OCO',
        order: 1,
      }),
      packageItemRepo.create({
        packageId: pkg1.id,
        ccoId: cco2.id,
        changeOrderType: 'CCO',
        order: 2,
      }),
    ]);

    // Update package total
    pkg1.totalAmount = oco2.amount + cco2.amount;
    await packageRepo.save(pkg1);

    // Package #2: SUBMITTED status
    const pkg2 = packageRepo.create({
      projectId: project.id,
      packageNumber: 'PKG-002',
      title: 'Parking Lot Expansion Package',
      description: 'All change orders related to parking lot expansion',
      status: CoPackageStatus.SUBMITTED,
      totalAmount: oco3.amount + cco1.amount,
      submittedAt: new Date('2024-02-10T11:00:00Z'),
      createdById: user.id,
    });
    packages.push(await packageRepo.save(pkg2));

    // Package #2 Items
    await packageItemRepo.save([
      packageItemRepo.create({
        packageId: pkg2.id,
        ocoId: oco3.id,
        changeOrderType: 'OCO',
        order: 1,
      }),
      packageItemRepo.create({
        packageId: pkg2.id,
        ccoId: cco1.id,
        changeOrderType: 'CCO',
        order: 2,
      }),
    ]);

    console.log(`✅ Created ${packages.length} change order packages\n`);

    // ========================================
    // SEED CHANGE ORDER HISTORY
    // ========================================
    console.log('📝 Creating change order history entries...\n');

    // OCO #4 history (executed)
    await historyRepo.save([
      historyRepo.create({
        changeOrderId: oco4.id,
        changeOrderType: 'OCO',
        action: CoAction.CREATED,
        previousStatus: undefined,
        newStatus: OcoStatus.DRAFT,
        performedBy: user.id,
        performedAt: new Date('2024-01-15T11:00:00Z'),
      }),
      historyRepo.create({
        changeOrderId: oco4.id,
        changeOrderType: 'OCO',
        action: CoAction.SUBMITTED,
        previousStatus: OcoStatus.DRAFT,
        newStatus: OcoStatus.PENDING_APPROVAL,
        performedBy: user.id,
        performedAt: new Date('2024-01-15T11:30:00Z'),
      }),
      historyRepo.create({
        changeOrderId: oco4.id,
        changeOrderType: 'OCO',
        action: CoAction.APPROVED,
        previousStatus: OcoStatus.PENDING_APPROVAL,
        newStatus: OcoStatus.APPROVED,
        performedBy: approver.id,
        performedAt: new Date('2024-01-20T10:00:00Z'),
        notes: 'Approved - fire marshal requirement',
      }),
      historyRepo.create({
        changeOrderId: oco4.id,
        changeOrderType: 'OCO',
        action: CoAction.EXECUTED,
        previousStatus: OcoStatus.APPROVED,
        newStatus: OcoStatus.EXECUTED,
        performedBy: user.id,
        performedAt: new Date('2024-01-25T16:00:00Z'),
        notes: 'Work completed and integrated into prime contract',
      }),
    ]);

    // CCO #4 history (executed)
    await historyRepo.save([
      historyRepo.create({
        changeOrderId: cco4.id,
        changeOrderType: 'CCO',
        action: CoAction.CREATED,
        previousStatus: undefined,
        newStatus: CcoStatus.DRAFT,
        performedBy: user.id,
        performedAt: new Date('2024-01-25T11:00:00Z'),
      }),
      historyRepo.create({
        changeOrderId: cco4.id,
        changeOrderType: 'CCO',
        action: CoAction.SUBMITTED,
        previousStatus: CcoStatus.DRAFT,
        newStatus: CcoStatus.PENDING_APPROVAL,
        performedBy: user.id,
        performedAt: new Date('2024-01-25T11:30:00Z'),
      }),
      historyRepo.create({
        changeOrderId: cco4.id,
        changeOrderType: 'CCO',
        action: CoAction.APPROVED,
        previousStatus: CcoStatus.PENDING_APPROVAL,
        newStatus: CcoStatus.APPROVED,
        performedBy: approver.id,
        performedAt: new Date('2024-01-28T09:00:00Z'),
        notes: 'Approved - unforeseen site conditions',
      }),
      historyRepo.create({
        changeOrderId: cco4.id,
        changeOrderType: 'CCO',
        action: CoAction.EXECUTED,
        previousStatus: CcoStatus.APPROVED,
        newStatus: CcoStatus.EXECUTED,
        performedBy: user.id,
        performedAt: new Date('2024-02-05T15:00:00Z'),
        notes: 'Work completed and commitment amount updated',
      }),
    ]);

    console.log('✅ Created change order history entries\n');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('========================================');
    console.log('✅ SEED COMPLETE!');
    console.log('========================================\n');
    console.log(`📋 Project: ${project.name}`);
    console.log(`   ID: ${project.id}\n`);
    console.log('📊 Summary:');
    console.log(`   - ${pcos.length} Potential Change Orders (PCOs)`);
    console.log(`   - ${ocos.length} Owner Change Orders (OCOs)`);
    console.log(`   - ${ccos.length} Commitment Change Orders (CCOs)`);
    console.log(`   - ${packages.length} Change Order Packages`);
    console.log(`   - ${8} History Entries\n`);
    console.log('🧪 Test with:');
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/change-orders"`);
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/pcos"`);
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/ocos"`);
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/ccos"`);
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/co-packages"`);
    console.log(`   curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/${project.id}/change-orders/summary"\n`);

    await dataSource.destroy();
    console.log('✅ Database connection closed\n');
  } catch (error) {
    console.error('❌ Error seeding change orders:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seed function
seedChangeOrders();
