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
import { BudgetAuditLog } from '../../modules/financials/entities/budget-audit-log.entity';
import { BudgetSnapshot } from '../../modules/financials/entities/budget-snapshot.entity';
import { PrimeContract } from '../../modules/financials/entities/prime-contract.entity';
import { Commitment } from '../../modules/financials/entities/commitment.entity';
import { CommitmentItem } from '../../modules/financials/entities/commitment-item.entity';
import { ScheduleOfValues } from '../../modules/financials/entities/schedule-of-values.entity';
import { ScheduleOfValuesItem } from '../../modules/financials/entities/schedule-of-values-item.entity';
import { PaymentApplication } from '../../modules/financials/entities/payment-application.entity';
import { PaymentApplicationItem } from '../../modules/financials/entities/payment-application-item.entity';
import { LienWaiver } from '../../modules/financials/entities/lien-waiver.entity';
import { PotentialChangeOrder } from '../../modules/financials/entities/potential-change-order.entity';
import { PcoCostTier } from '../../modules/financials/entities/pco-cost-tier.entity';
import { OwnerChangeOrder } from '../../modules/financials/entities/owner-change-order.entity';
import { OcoCostBreakdown } from '../../modules/financials/entities/oco-cost-breakdown.entity';
import { CommitmentChangeOrder } from '../../modules/financials/entities/commitment-change-order.entity';
import { CcoLineItem } from '../../modules/financials/entities/cco-line-item.entity';
import { CcoTmEntry } from '../../modules/financials/entities/cco-tm-entry.entity';
import { ChangeOrderPackage } from '../../modules/financials/entities/change-order-package.entity';
import { ChangeOrderPackageItem } from '../../modules/financials/entities/change-order-package-item.entity';
import { ApprovalThreshold } from '../../modules/financials/entities/approval-threshold.entity';
import { ChangeOrderHistory } from '../../modules/financials/entities/change-order-history.entity';
import { ChangeOrderDocument } from '../../modules/financials/entities/change-order-document.entity';
import { CostEntry } from '../../modules/financials/entities/cost-entry.entity';
import { CostTransfer } from '../../modules/financials/entities/cost-transfer.entity';
import { Accrual } from '../../modules/financials/entities/accrual.entity';
import { CostPeriod } from '../../modules/financials/entities/cost-period.entity';
import { CostEntryHistory } from '../../modules/financials/entities/cost-entry-history.entity';
import { ReportSchedule } from '../../modules/financials/entities/report-schedule.entity';
import { CustomReport } from '../../modules/financials/entities/custom-report.entity';
import { ReportExecution } from '../../modules/financials/entities/report-execution.entity';
import { CommitmentType } from '../../modules/financials/enums/commitment-type.enum';
import { CommitmentStatus } from '../../modules/financials/enums/commitment-status.enum';
import { BudgetCategory } from '../../modules/financials/enums/budget-category.enum';
import { FolderType } from '../../modules/projects/enums/folder-type.enum';
import { FolderValidationService } from '../../modules/projects/services/folder-validation.service';
import { ProjectFolderService } from '../../modules/projects/services/project-folder.service';
import { FolderPermissionsService } from '../../modules/projects/services/folder-permissions.service';
import { FolderStatisticsService } from '../../modules/projects/services/folder-statistics.service';
import { FolderOperationsService } from '../../modules/projects/services/folder-operations.service';

/**
 * Commitment Management Seed Script
 *
 * Seeds the database with:
 * - Commitments (Subcontracts and Purchase Orders)
 * - Commitment line items mapped to cost codes
 * - Various commitment statuses for testing workflow
 *
 * Prerequisites:
 * - Run seed.ts first to create users and projects
 * - Run seed-csi-cost-codes.ts to create cost codes
 *
 * Usage:
 * npm run seed:commitments
 */

async function seedCommitments() {
  console.log('🌱 Starting commitment management seed...\n');

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
      BudgetAuditLog,
      BudgetSnapshot,
      PrimeContract,
      Commitment,
      CommitmentItem,
      ScheduleOfValues,
      ScheduleOfValuesItem,
      PaymentApplication,
      PaymentApplicationItem,
      LienWaiver,
      PotentialChangeOrder,
      PcoCostTier,
      OwnerChangeOrder,
      OcoCostBreakdown,
      CommitmentChangeOrder,
      CcoLineItem,
      CcoTmEntry,
      ChangeOrderPackage,
      ChangeOrderPackageItem,
      ApprovalThreshold,
      ChangeOrderHistory,
      ChangeOrderDocument,
      CostEntry,
      CostTransfer,
      Accrual,
      CostPeriod,
      CostEntryHistory,
      ReportSchedule,
      CustomReport,
      ReportExecution,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const projectRepo = dataSource.getRepository(Project);
  const costCodeRepo = dataSource.getRepository(CostCode);
  const commitmentRepo = dataSource.getRepository(Commitment);
  const commitmentItemRepo = dataSource.getRepository(CommitmentItem);
  const userRepo = dataSource.getRepository(User);
  const folderRepo = dataSource.getRepository(ProjectFolder);

  // Initialize folder services for folder creation
  const folderValidationService = new FolderValidationService(folderRepo);
  const folderPermissionsService = new FolderPermissionsService(folderRepo);
  const folderStatisticsService = new FolderStatisticsService(folderRepo);
  const folderOperationsService = new FolderOperationsService(
    folderRepo,
    folderValidationService,
    folderStatisticsService,
    dataSource,
  );
  const projectFolderService = new ProjectFolderService(
    folderRepo,
    folderValidationService,
    folderPermissionsService,
    folderStatisticsService,
    folderOperationsService,
    dataSource,
  );

  try {
    // Get first project
    const projects = await projectRepo.find({ take: 1 });
    if (projects.length === 0) {
      console.error('❌ No projects found. Please run seed.ts first.');
      process.exit(1);
    }
    const project = projects[0];
    console.log(`📋 Using project: ${project.name} (${project.id})\n`);

    // Get cost codes
    const costCodes = await costCodeRepo.find({
      where: { projectId: project.id },
      take: 10
    });
    if (costCodes.length === 0) {
      console.error('❌ No cost codes found. Please run seed-csi-cost-codes.ts first.');
      process.exit(1);
    }
    console.log(`📊 Found ${costCodes.length} cost codes\n`);

    // Get a user for approvals
    const users = await userRepo.find({ take: 1 });
    const approverUser = users[0];

    // Clear existing commitments for this project
    console.log('🧹 Clearing existing commitments...');
    await dataSource.query(
      'DELETE FROM commitment_items WHERE commitment_id IN (SELECT id FROM commitments WHERE project_id = $1)',
      [project.id]
    );
    await dataSource.query('DELETE FROM commitments WHERE project_id = $1', [project.id]);
    console.log('✅ Existing commitments cleared\n');

    // ========================================
    // SEED COMMITMENTS
    // ========================================
    console.log('📝 Creating commitments...\n');

    const commitmentData = [
      // SUBCONTRACTS
      {
        type: CommitmentType.SUBCONTRACT,
        status: CommitmentStatus.ACTIVE,
        number: 'SC-001',
        title: 'Concrete Foundation & Structural Work',
        description: 'Complete concrete foundation, footings, and structural slab work including rebar placement and finishing',
        vendorName: 'Titan Concrete Services',
        vendorContact: 'John Martinez',
        vendorEmail: 'john@titanconcrete.com',
        originalAmount: 450000,
        currentAmount: 465000,
        retentionPercent: 10,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31'),
        items: [
          { costCodeIndex: 0, description: 'Foundation footings and grade beams (250 CY)', quantity: 250, unitCost: 180, amount: 45000 },
          { costCodeIndex: 0, description: 'Structural concrete slabs (500 CY)', quantity: 500, unitCost: 200, amount: 100000 },
          { costCodeIndex: 1, description: 'Rebar and mesh installation (LS)', quantity: 1, unitCost: 85000, amount: 85000 },
          { costCodeIndex: 1, description: 'Concrete finishing and curing (LS)', quantity: 1, unitCost: 50000, amount: 50000 },
        ],
      },
      {
        type: CommitmentType.SUBCONTRACT,
        status: CommitmentStatus.ACTIVE,
        number: 'SC-002',
        title: 'HVAC System Installation',
        description: 'Supply and install complete HVAC system including ductwork, air handlers, and controls',
        vendorName: 'Climate Control Solutions',
        vendorContact: 'Sarah Thompson',
        vendorEmail: 'sarah@climatecontrol.com',
        originalAmount: 385000,
        currentAmount: 395000,
        retentionPercent: 5,
        startDate: new Date('2024-05-15'),
        endDate: new Date('2024-11-30'),
        items: [
          { costCodeIndex: 2, description: 'HVAC equipment and air handlers', quantity: 8, unitCost: 25000, amount: 200000 },
          { costCodeIndex: 2, description: 'Ductwork installation', quantity: 1, unitCost: 120000, amount: 120000 },
          { costCodeIndex: 3, description: 'Controls and automation system', quantity: 1, unitCost: 65000, amount: 65000 },
        ],
      },
      {
        type: CommitmentType.SUBCONTRACT,
        status: CommitmentStatus.PENDING_APPROVAL,
        number: 'SC-003',
        title: 'Electrical Rough-In & Distribution',
        description: 'Electrical rough-in, panel installation, and power distribution system',
        vendorName: 'PowerLine Electric',
        vendorContact: 'Mike Johnson',
        vendorEmail: 'mike@powerlineelectric.com',
        originalAmount: 275000,
        currentAmount: 275000,
        retentionPercent: 10,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-12-15'),
        items: [
          { costCodeIndex: 4, description: 'Main electrical panels and switchgear', quantity: 5, unitCost: 15000, amount: 75000 },
          { costCodeIndex: 4, description: 'Conduit and wire rough-in', quantity: 1, unitCost: 125000, amount: 125000 },
          { costCodeIndex: 5, description: 'Lighting fixtures and controls', quantity: 1, unitCost: 75000, amount: 75000 },
        ],
      },
      {
        type: CommitmentType.SUBCONTRACT,
        status: CommitmentStatus.APPROVED,
        number: 'SC-004',
        title: 'Plumbing Systems',
        description: 'Complete plumbing installation including water supply, drainage, and fixtures',
        vendorName: 'AquaFlow Plumbing',
        vendorContact: 'Lisa Chen',
        vendorEmail: 'lisa@aquaflow.com',
        originalAmount: 195000,
        currentAmount: 195000,
        retentionPercent: 5,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-01-31'),
        items: [
          { costCodeIndex: 6, description: 'Water supply piping and valves', quantity: 1, unitCost: 80000, amount: 80000 },
          { costCodeIndex: 6, description: 'Drainage and waste piping', quantity: 1, unitCost: 65000, amount: 65000 },
          { costCodeIndex: 7, description: 'Plumbing fixtures and trim', quantity: 1, unitCost: 50000, amount: 50000 },
        ],
      },
      {
        type: CommitmentType.SUBCONTRACT,
        status: CommitmentStatus.DRAFT,
        number: 'SC-005',
        title: 'Drywall & Interior Finishes',
        description: 'Drywall installation, taping, and finishing for all interior walls and ceilings',
        vendorName: 'Precision Drywall',
        vendorContact: 'Robert Davis',
        vendorEmail: 'robert@precisiondrywall.com',
        originalAmount: 165000,
        currentAmount: 165000,
        retentionPercent: 10,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-02-28'),
        items: [
          { costCodeIndex: 8, description: 'Drywall materials and installation', quantity: 45000, unitCost: 2.5, amount: 112500 },
          { costCodeIndex: 8, description: 'Taping and finishing', quantity: 45000, unitCost: 1.17, amount: 52500 },
        ],
      },

      // PURCHASE ORDERS
      {
        type: CommitmentType.PURCHASE_ORDER,
        status: CommitmentStatus.ACTIVE,
        number: 'PO-1001',
        title: 'Steel Beams & Structural Steel',
        description: 'Structural steel beams, columns, and connections per engineering drawings',
        vendorName: 'Metro Steel Supply',
        vendorContact: 'David Wilson',
        vendorEmail: 'david@metrosteel.com',
        originalAmount: 325000,
        currentAmount: 325000,
        retentionPercent: 0,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30'),
        items: [
          { costCodeIndex: 1, description: 'W-section steel beams', quantity: 45, unitCost: 4500, amount: 202500 },
          { costCodeIndex: 1, description: 'Steel columns and connections', quantity: 1, unitCost: 122500, amount: 122500 },
        ],
      },
      {
        type: CommitmentType.PURCHASE_ORDER,
        status: CommitmentStatus.COMPLETE,
        number: 'PO-1002',
        title: 'Windows & Exterior Doors',
        description: 'Energy-efficient windows and exterior door systems with hardware',
        vendorName: 'Vista Window & Door',
        vendorContact: 'Emily Rodriguez',
        vendorEmail: 'emily@vistawindow.com',
        originalAmount: 145000,
        currentAmount: 145000,
        retentionPercent: 0,
        startDate: new Date('2024-04-15'),
        endDate: new Date('2024-07-31'),
        items: [
          { costCodeIndex: 9, description: 'Aluminum storefront windows', quantity: 85, unitCost: 1200, amount: 102000 },
          { costCodeIndex: 9, description: 'Exterior door systems', quantity: 12, unitCost: 3583.33, amount: 43000 },
        ],
      },
      {
        type: CommitmentType.PURCHASE_ORDER,
        status: CommitmentStatus.ACTIVE,
        number: 'PO-1003',
        title: 'Lumber & Framing Materials',
        description: 'Dimensional lumber, plywood, and framing hardware',
        vendorName: 'BuildRight Lumber Co',
        vendorContact: 'Tom Anderson',
        vendorEmail: 'tom@buildrightlumber.com',
        originalAmount: 95000,
        currentAmount: 98500,
        retentionPercent: 0,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-10-31'),
        items: [
          { costCodeIndex: 0, description: '2x4 and 2x6 dimensional lumber', quantity: 1, unitCost: 55000, amount: 55000 },
          { costCodeIndex: 0, description: 'Plywood sheathing (3/4" and 1/2")', quantity: 350, unitCost: 85, amount: 29750 },
          { costCodeIndex: 1, description: 'Framing hardware and connectors', quantity: 1, unitCost: 13750, amount: 13750 },
        ],
      },
      {
        type: CommitmentType.PURCHASE_ORDER,
        status: CommitmentStatus.PENDING_APPROVAL,
        number: 'PO-1004',
        title: 'Paint & Finishing Materials',
        description: 'Interior and exterior paint, primers, and finishing supplies',
        vendorName: 'ColorWorks Paint Supply',
        vendorContact: 'Jennifer Lee',
        vendorEmail: 'jennifer@colorworks.com',
        originalAmount: 35000,
        currentAmount: 35000,
        retentionPercent: 0,
        items: [
          { costCodeIndex: 8, description: 'Interior paint and primer', quantity: 500, unitCost: 45, amount: 22500 },
          { costCodeIndex: 8, description: 'Exterior paint and sealers', quantity: 250, unitCost: 50, amount: 12500 },
        ],
      },
      {
        type: CommitmentType.PURCHASE_ORDER,
        status: CommitmentStatus.DRAFT,
        number: 'PO-1005',
        title: 'Flooring Materials',
        description: 'Tile, hardwood, and carpet materials for interior spaces',
        vendorName: 'FloorMasters Supply',
        vendorContact: 'Kevin Brown',
        vendorEmail: 'kevin@floormasters.com',
        originalAmount: 125000,
        currentAmount: 125000,
        retentionPercent: 0,
        items: [
          { costCodeIndex: 7, description: 'Ceramic and porcelain tile', quantity: 8000, unitCost: 8.5, amount: 68000 },
          { costCodeIndex: 7, description: 'Hardwood flooring (oak)', quantity: 3500, unitCost: 12, amount: 42000 },
          { costCodeIndex: 7, description: 'Commercial carpet', quantity: 2500, unitCost: 6, amount: 15000 },
        ],
      },
    ];

    const createdCommitments: Commitment[] = [];

    for (const data of commitmentData) {
      // Create commitment
      const commitment = commitmentRepo.create({
        projectId: project.id,
        type: data.type,
        status: data.status,
        number: data.number,
        title: data.title,
        description: data.description,
        vendorName: data.vendorName,
        vendorContact: data.vendorContact,
        vendorEmail: data.vendorEmail,
        originalAmount: data.originalAmount,
        currentAmount: data.currentAmount,
        retentionPercent: data.retentionPercent,
        startDate: data.startDate,
        endDate: data.endDate,
        invoicedAmount: 0,
        paidAmount: 0,
      });

      // Set approval fields for approved/active/complete commitments
      if ([CommitmentStatus.APPROVED, CommitmentStatus.ACTIVE, CommitmentStatus.COMPLETE].includes(data.status)) {
        commitment.approvedById = approverUser.id;
        commitment.approvedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date in last 30 days
      }

      const savedCommitment = await commitmentRepo.save(commitment);
      createdCommitments.push(savedCommitment);

      console.log(`  ✓ Created ${data.type}: ${savedCommitment.number} - ${savedCommitment.title}`);
      console.log(`    Status: ${savedCommitment.status}, Amount: $${savedCommitment.currentAmount.toLocaleString()}`);

      // Create folder structure for the commitment manually
      // Note: We can't use ensureCommitmentFolderStructure in seed scripts because it uses 'system' as createdBy
      // which is not a valid UUID. So we'll manually create the folder hierarchy.
      try {
        // 1. Find or create Financials folder
        let financialsFolder = await folderRepo.findOne({
          where: { projectId: project.id, parentId: null as any, name: 'Financials' },
        });
        if (!financialsFolder) {
          financialsFolder = folderRepo.create({
            projectId: project.id,
            parentId: null,
            name: 'Financials',
            folderType: FolderType.FINANCIAL,
            level: 0,
            path: '/Financials',
            createdBy: approverUser.id,
            updatedBy: approverUser.id,
          });
          financialsFolder = await folderRepo.save(financialsFolder);
        }

        // 2. Find or create Commitments folder
        let commitmentsFolder = await folderRepo.findOne({
          where: { projectId: project.id, parentId: financialsFolder.id, name: 'Commitments' },
        });
        if (!commitmentsFolder) {
          commitmentsFolder = folderRepo.create({
            projectId: project.id,
            parentId: financialsFolder.id,
            name: 'Commitments',
            folderType: FolderType.GENERAL,
            level: 1,
            path: '/Financials/Commitments',
            createdBy: approverUser.id,
            updatedBy: approverUser.id,
          });
          commitmentsFolder = await folderRepo.save(commitmentsFolder);
        }

        // 3. Find or create title folder (e.g., "Concrete Foundation & Structural Work")
        const titleFolderName = savedCommitment.title || 'General Commitment';
        let titleFolder = await folderRepo.findOne({
          where: { projectId: project.id, parentId: commitmentsFolder.id, name: titleFolderName },
        });
        if (!titleFolder) {
          titleFolder = folderRepo.create({
            projectId: project.id,
            parentId: commitmentsFolder.id,
            name: titleFolderName,
            folderType: FolderType.GENERAL,
            level: 2,
            path: `/Financials/Commitments/${titleFolderName}`,
            createdBy: approverUser.id,
            updatedBy: approverUser.id,
          });
          titleFolder = await folderRepo.save(titleFolder);
        }

        // 4. Create commitment-specific folder (e.g., "SC-001 - Titan Concrete Services")
        const commitmentFolderName = `${savedCommitment.number} - ${savedCommitment.vendorName}`;
        const commitmentFolder = folderRepo.create({
          projectId: project.id,
          parentId: titleFolder.id,
          name: commitmentFolderName,
          folderType: FolderType.GENERAL,
          level: 3,
          path: `/Financials/Commitments/${titleFolderName}/${commitmentFolderName}`,
          customFields: {
            commitmentId: savedCommitment.id,
            commitmentNumber: savedCommitment.number,
            commitmentTitle: titleFolderName,
          },
          createdBy: approverUser.id,
          updatedBy: approverUser.id,
        });
        const savedFolder = await folderRepo.save(commitmentFolder);

        // Update commitment with folder ID
        savedCommitment.folderId = savedFolder.id;
        await commitmentRepo.save(savedCommitment);

        console.log(`    Folder: ${savedFolder.path}`);
      } catch (error: any) {
        console.error(`    ⚠️  Failed to create folder: ${error?.message || error}`);
        // Don't fail the entire seed if folder creation fails
      }

      // Create commitment items
      for (const itemData of data.items) {
        const costCode = costCodes[itemData.costCodeIndex % costCodes.length];

        const item = commitmentItemRepo.create({
          commitmentId: savedCommitment.id,
          costCodeId: costCode.id,
          category: BudgetCategory.LABOR, // Default to LABOR, can be adjusted per item
          description: itemData.description,
          quantity: itemData.quantity,
          unitCost: itemData.unitCost,
          amount: itemData.amount,
        });

        await commitmentItemRepo.save(item);
      }

      console.log(`    Items: ${data.items.length} line items created\n`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('✅ COMMITMENT SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════\n');

    const subcontracts = createdCommitments.filter(c => c.type === CommitmentType.SUBCONTRACT);
    const purchaseOrders = createdCommitments.filter(c => c.type === CommitmentType.PURCHASE_ORDER);

    const totalCommitted = createdCommitments.reduce((sum, c) => sum + Number(c.currentAmount), 0);

    console.log('📊 Summary:');
    console.log(`  • ${createdCommitments.length} total commitments created`);
    console.log(`    - ${subcontracts.length} subcontracts`);
    console.log(`    - ${purchaseOrders.length} purchase orders`);
    console.log(`  • Total committed amount: $${totalCommitted.toLocaleString()}`);
    console.log('');

    console.log('📈 Status Breakdown:');
    const statusCounts = {
      DRAFT: createdCommitments.filter(c => c.status === CommitmentStatus.DRAFT).length,
      PENDING_APPROVAL: createdCommitments.filter(c => c.status === CommitmentStatus.PENDING_APPROVAL).length,
      APPROVED: createdCommitments.filter(c => c.status === CommitmentStatus.APPROVED).length,
      ACTIVE: createdCommitments.filter(c => c.status === CommitmentStatus.ACTIVE).length,
      COMPLETE: createdCommitments.filter(c => c.status === CommitmentStatus.COMPLETE).length,
    };
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  • ${status}: ${count}`);
      }
    });
    console.log('');

    console.log('🎯 Next Steps:');
    console.log(`  1. View commitments: GET /api/projects/${project.id}/commitments`);
    console.log(`  2. Filter by type: GET /api/projects/${project.id}/commitments?type=SUBCONTRACT`);
    console.log(`  3. Filter by status: GET /api/projects/${project.id}/commitments?status=ACTIVE`);
    console.log(`  4. Test workflow transitions (submit, approve, activate)`);
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

// Run seed
seedCommitments()
  .then(() => {
    console.log('\n🎉 Commitment seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Commitment seed script failed:', error);
    process.exit(1);
  });
