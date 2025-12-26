import { DataSource } from 'typeorm';
import { Project } from '../../modules/projects/entities/project.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationMember } from '../../modules/organizations/entities/organization-member.entity';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
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
import { BudgetStatus } from '../../modules/financials/enums/budget-status.enum';
import { BudgetCategory } from '../../modules/financials/enums/budget-category.enum';

/**
 * Budget Management Seed Script
 *
 * Seeds the database with:
 * - Cost codes (CSI MasterFormat structure)
 * - Budget with line items
 * - Budget snapshots
 *
 * Prerequisites:
 * - Run seed-dashboard.ts first to create users and projects
 *
 * Usage:
 * npm run seed:budgets
 */

async function seedBudgets() {
  console.log('🌱 Starting budget management seed...\n');

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
  const userRepo = dataSource.getRepository(User);
  const costCodeRepo = dataSource.getRepository(CostCode);
  const budgetRepo = dataSource.getRepository(Budget);
  const lineItemRepo = dataSource.getRepository(BudgetLineItem);
  const snapshotRepo = dataSource.getRepository(BudgetSnapshot);

  try {
    // Get the first project and user
    const project = await projectRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    const user = await userRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });

    if (!project) {
      console.error('❌ No project found. Please run seed-dashboard.ts first.');
      process.exit(1);
    }

    if (!user) {
      console.error('❌ No user found. Please run seed-dashboard.ts first.');
      process.exit(1);
    }

    console.log(`📊 Using Project: ${project.name} (${project.id})`);
    console.log(`👤 Using User: ${user.firstName} ${user.lastName} (${user.id})\n`);

    // Clear existing budget data
    console.log('🧹 Clearing existing budget data...');
    await dataSource.query('TRUNCATE TABLE "budget_snapshots" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "budget_line_items" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "budgets" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "cost_codes" RESTART IDENTITY CASCADE');
    console.log('✅ Existing budget data cleared\n');

    // ========================================
    // SEED COST CODES
    // ========================================
    console.log('📋 Creating cost codes (CSI MasterFormat)...');

    const costCodes = await costCodeRepo.save([
      // Division 01 - General Requirements
      {
        projectId: project.id,
        code: '01',
        name: 'General Requirements',
        description: 'Administrative and temporary facilities',
        fullCode: '01',
        division: 1,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '01 10 00',
        name: 'Summary',
        description: 'Project summary and work restrictions',
        fullCode: '01 10 00',
        division: 1,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '01 50 00',
        name: 'Temporary Facilities and Controls',
        description: 'Temporary utilities and site facilities',
        fullCode: '01 50 00',
        division: 1,
        isActive: true,
      },

      // Division 03 - Concrete
      {
        projectId: project.id,
        code: '03',
        name: 'Concrete',
        description: 'Concrete materials and placement',
        fullCode: '03',
        division: 3,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '03 30 00',
        name: 'Cast-in-Place Concrete',
        description: 'Formwork, reinforcement, and concrete placement',
        fullCode: '03 30 00',
        division: 3,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '03 35 00',
        name: 'Concrete Finishing',
        description: 'Surface finishing and treatments',
        fullCode: '03 35 00',
        division: 3,
        isActive: true,
      },

      // Division 05 - Metals
      {
        projectId: project.id,
        code: '05',
        name: 'Metals',
        description: 'Structural and miscellaneous metals',
        fullCode: '05',
        division: 5,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '05 12 00',
        name: 'Structural Steel Framing',
        description: 'Steel beams, columns, and connections',
        fullCode: '05 12 00',
        division: 5,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '05 50 00',
        name: 'Metal Fabrications',
        description: 'Stairs, railings, and miscellaneous metals',
        fullCode: '05 50 00',
        division: 5,
        isActive: true,
      },

      // Division 09 - Finishes
      {
        projectId: project.id,
        code: '09',
        name: 'Finishes',
        description: 'Interior finishes and coatings',
        fullCode: '09',
        division: 9,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '09 29 00',
        name: 'Gypsum Board',
        description: 'Drywall installation and finishing',
        fullCode: '09 29 00',
        division: 9,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '09 65 00',
        name: 'Resilient Flooring',
        description: 'Vinyl and tile flooring',
        fullCode: '09 65 00',
        division: 9,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '09 90 00',
        name: 'Painting and Coating',
        description: 'Interior and exterior painting',
        fullCode: '09 90 00',
        division: 9,
        isActive: true,
      },

      // Division 23 - HVAC
      {
        projectId: project.id,
        code: '23',
        name: 'HVAC',
        description: 'Heating, ventilation, and air conditioning',
        fullCode: '23',
        division: 23,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '23 05 00',
        name: 'Common Work Results for HVAC',
        description: 'HVAC materials and equipment',
        fullCode: '23 05 00',
        division: 23,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '23 34 00',
        name: 'HVAC Fans',
        description: 'Exhaust and supply fans',
        fullCode: '23 34 00',
        division: 23,
        isActive: true,
      },

      // Division 26 - Electrical
      {
        projectId: project.id,
        code: '26',
        name: 'Electrical',
        description: 'Electrical systems and equipment',
        fullCode: '26',
        division: 26,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '26 05 00',
        name: 'Common Work Results for Electrical',
        description: 'Electrical materials and equipment',
        fullCode: '26 05 00',
        division: 26,
        isActive: true,
      },
      {
        projectId: project.id,
        code: '26 27 00',
        name: 'Data Communications',
        description: 'Network and data cabling',
        fullCode: '26 27 00',
        division: 26,
        isActive: true,
      },
    ]);

    console.log(`✅ Created ${costCodes.length} cost codes\n`);

    // ========================================
    // SEED BUDGET
    // ========================================
    console.log('💰 Creating budget...');

    const budget = await budgetRepo.save({
      projectId: project.id,
      name: '2024 Original Budget',
      description: 'Initial project budget approved January 2024',
      totalBudget: 5000000,
      status: BudgetStatus.ACTIVE,
      createdById: user.id,
    });

    console.log(`✅ Created budget: ${budget.name} (${budget.id})\n`);

    // ========================================
    // SEED BUDGET LINE ITEMS
    // ========================================
    console.log('📝 Creating budget line items...');

    // Helper to find cost code by code
    const findCostCode = (code: string) =>
      costCodes.find(cc => cc.code === code);

    const lineItems = await lineItemRepo.save([
      // General Requirements
      {
        budgetId: budget.id,
        costCodeId: findCostCode('01 10 00')?.id,
        category: BudgetCategory.LABOR,
        description: 'Project management and supervision',
        quantity: 1,
        unit: 'LS',
        unitCost: 250000,
        budgetedCost: 250000,
        committedCost: 250000,
        actualCost: 125000,
        forecastCost: 245000,
        order: 1,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('01 50 00')?.id,
        category: BudgetCategory.OTHER,
        description: 'Temporary facilities and utilities',
        quantity: 12,
        unit: 'MO',
        unitCost: 8333.33,
        budgetedCost: 100000,
        committedCost: 95000,
        actualCost: 48000,
        forecastCost: 98000,
        order: 2,
      },

      // Concrete
      {
        budgetId: budget.id,
        costCodeId: findCostCode('03 30 00')?.id,
        category: BudgetCategory.MATERIAL,
        description: 'Foundation and structural concrete',
        quantity: 2500,
        unit: 'CY',
        unitCost: 200,
        budgetedCost: 500000,
        committedCost: 485000,
        actualCost: 360000,
        forecastCost: 490000,
        order: 3,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('03 35 00')?.id,
        category: BudgetCategory.LABOR,
        description: 'Concrete finishing and troweling',
        quantity: 45000,
        unit: 'SF',
        unitCost: 3.50,
        budgetedCost: 157500,
        committedCost: 150000,
        actualCost: 95000,
        forecastCost: 155000,
        order: 4,
      },

      // Metals
      {
        budgetId: budget.id,
        costCodeId: findCostCode('05 12 00')?.id,
        category: BudgetCategory.MATERIAL,
        description: 'Structural steel frame',
        quantity: 850,
        unit: 'TON',
        unitCost: 1500,
        budgetedCost: 1275000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 1275000,
        order: 5,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('05 50 00')?.id,
        category: BudgetCategory.SUBCONTRACT,
        description: 'Stairs, railings, and misc metals',
        quantity: 1,
        unit: 'LS',
        unitCost: 125000,
        budgetedCost: 125000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 125000,
        order: 6,
      },

      // Finishes
      {
        budgetId: budget.id,
        costCodeId: findCostCode('09 29 00')?.id,
        category: BudgetCategory.SUBCONTRACT,
        description: 'Gypsum board and metal framing',
        quantity: 120000,
        unit: 'SF',
        unitCost: 2.75,
        budgetedCost: 330000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 330000,
        order: 7,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('09 65 00')?.id,
        category: BudgetCategory.MATERIAL,
        description: 'Vinyl composition tile flooring',
        quantity: 80000,
        unit: 'SF',
        unitCost: 4.25,
        budgetedCost: 340000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 340000,
        order: 8,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('09 90 00')?.id,
        category: BudgetCategory.SUBCONTRACT,
        description: 'Interior and exterior painting',
        quantity: 150000,
        unit: 'SF',
        unitCost: 1.50,
        budgetedCost: 225000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 225000,
        order: 9,
      },

      // HVAC
      {
        budgetId: budget.id,
        costCodeId: findCostCode('23 05 00')?.id,
        category: BudgetCategory.EQUIPMENT,
        description: 'HVAC equipment and systems',
        quantity: 1,
        unit: 'LS',
        unitCost: 650000,
        budgetedCost: 650000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 650000,
        order: 10,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('23 34 00')?.id,
        category: BudgetCategory.EQUIPMENT,
        description: 'Exhaust and ventilation fans',
        quantity: 45,
        unit: 'EA',
        unitCost: 1200,
        budgetedCost: 54000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 54000,
        order: 11,
      },

      // Electrical
      {
        budgetId: budget.id,
        costCodeId: findCostCode('26 05 00')?.id,
        category: BudgetCategory.SUBCONTRACT,
        description: 'Electrical distribution and power',
        quantity: 1,
        unit: 'LS',
        unitCost: 450000,
        budgetedCost: 450000,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 450000,
        order: 12,
      },
      {
        budgetId: budget.id,
        costCodeId: findCostCode('26 27 00')?.id,
        category: BudgetCategory.MATERIAL,
        description: 'Data and communications cabling',
        quantity: 1,
        unit: 'LS',
        unitCost: 93500,
        budgetedCost: 93500,
        committedCost: 0,
        actualCost: 0,
        forecastCost: 93500,
        order: 13,
      },
    ]);

    console.log(`✅ Created ${lineItems.length} budget line items\n`);

    // ========================================
    // UPDATE BUDGET TOTALS
    // ========================================
    console.log('🔄 Calculating budget totals...');

    const totals = lineItems.reduce(
      (acc, item) => ({
        budgeted: acc.budgeted + item.budgetedCost,
        committed: acc.committed + item.committedCost,
        actual: acc.actual + item.actualCost,
        forecast: acc.forecast + item.forecastCost,
      }),
      { budgeted: 0, committed: 0, actual: 0, forecast: 0 }
    );

    await budgetRepo.update(budget.id, {
      totalBudget: totals.budgeted,
    });

    console.log('✅ Budget totals updated');
    console.log(`   - Budgeted: $${totals.budgeted.toLocaleString()}`);
    console.log(`   - Committed: $${totals.committed.toLocaleString()}`);
    console.log(`   - Actual: $${totals.actual.toLocaleString()}`);
    console.log(`   - Forecast: $${totals.forecast.toLocaleString()}\n`);

    // ========================================
    // CREATE BUDGET SNAPSHOT
    // ========================================
    console.log('📸 Creating budget snapshot...');

    const snapshot = await snapshotRepo.save({
      budgetId: budget.id,
      name: 'Baseline Snapshot',
      description: 'Initial budget baseline for comparison',
      originalAmount: totals.budgeted,
      revisedAmount: totals.budgeted,
      snapshotData: {
        budget: {
          ...budget,
          lineItems: lineItems.map(li => ({
            ...li,
            costCode: findCostCode(costCodes.find(cc => cc.id === li.costCodeId)?.code || '')
          }))
        },
        totals,
        timestamp: new Date().toISOString(),
      },
      createdById: user.id,
    });

    console.log(`✅ Created snapshot: ${snapshot.name} (${snapshot.id})\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('✅ Budget seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Cost Codes: ${costCodes.length}`);
    console.log(`   - Budgets: 1`);
    console.log(`   - Line Items: ${lineItems.length}`);
    console.log(`   - Snapshots: 1`);
    console.log(`   - Total Budget: $${totals.budgeted.toLocaleString()}`);
    console.log(`\n🎯 Budget ID: ${budget.id}`);
    console.log(`🎯 Project ID: ${project.id}`);
    console.log(`\n📝 Test the endpoints:`);
    console.log(`   GET    http://localhost:3000/api/v1/projects/${project.id}/budgets`);
    console.log(`   GET    http://localhost:3000/api/v1/projects/${project.id}/budgets/${budget.id}`);
    console.log(`   GET    http://localhost:3000/api/v1/projects/${project.id}/budgets/${budget.id}/summary`);
    console.log(`   GET    http://localhost:3000/api/v1/projects/${project.id}/cost-codes`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run seed
seedBudgets()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
