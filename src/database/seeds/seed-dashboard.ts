import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationMember } from '../../modules/organizations/entities/organization-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { ProjectPhase } from '../../modules/projects/entities/project-phase.entity';
import { ProjectMilestone } from '../../modules/projects/entities/project-milestone.entity';
import { SystemRole } from '../../modules/users/enums/system-role.enum';
import { OrganizationRole } from '../../modules/users/enums/organization-role.enum';
import { ProjectRole } from '../../modules/users/enums/project-role.enum';
import { ProjectStatus } from '../../modules/projects/enums/project-status.enum';
import { ProjectType } from '../../modules/projects/enums/project-type.enum';
import { PhaseStatus } from '../../modules/projects/enums/phase-status.enum';
import { MilestoneStatus } from '../../modules/projects/enums/milestone-status.enum';

/**
 * Enhanced Database Seed Script with Dashboard Data
 *
 * Populates the database with comprehensive sample data:
 * - Users, Organizations, Projects (from original seed)
 * - Project Phases with realistic construction timeline
 * - Project Milestones with completion tracking
 * - Project budget and settings
 *
 * Usage:
 * npm run seed:dashboard
 */

async function seedDashboard() {
  console.log('🌱 Starting enhanced database seed with dashboard data...\n');

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
      ProjectPhase,
      ProjectMilestone,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const orgMemberRepo = dataSource.getRepository(OrganizationMember);
  const projectRepo = dataSource.getRepository(Project);
  const projectMemberRepo = dataSource.getRepository(ProjectMember);
  const phaseRepo = dataSource.getRepository(ProjectPhase);
  const milestoneRepo = dataSource.getRepository(ProjectMilestone);

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await dataSource.query('TRUNCATE TABLE "project_milestones" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "project_phases" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "project_members" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "projects" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "organization_members" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "organizations" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
    console.log('✅ Existing data cleared\n');

    // ========================================
    // SEED USERS
    // ========================================
    console.log('👥 Creating users...');

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const users = await userRepo.save([
      {
        email: 'admin@bobbuilder.com',
        password: await bcrypt.hash('Admin123!', 10),
        firstName: 'System',
        lastName: 'Admin',
        phoneNumber: '+1-555-000-0001',
        systemRole: SystemRole.SYSTEM_ADMIN,
      },
      {
        email: 'john.smith@acme.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Smith',
        phoneNumber: '+1-555-100-0001',
        systemRole: SystemRole.USER,
      },
      {
        email: 'sarah.johnson@acme.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        phoneNumber: '+1-555-100-0002',
        systemRole: SystemRole.USER,
      },
      {
        email: 'mike.davis@acme.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Davis',
        phoneNumber: '+1-555-100-0003',
        systemRole: SystemRole.USER,
      },
      {
        email: 'emily.brown@acme.com',
        password: hashedPassword,
        firstName: 'Emily',
        lastName: 'Brown',
        phoneNumber: '+1-555-100-0004',
        systemRole: SystemRole.USER,
      },
    ]);

    console.log(`✅ Created ${users.length} users\n`);

    // ========================================
    // SEED ORGANIZATIONS
    // ========================================
    console.log('🏢 Creating organizations...');

    const organization = await orgRepo.save({
      name: 'ACME Construction',
      slug: 'acme-construction',
      type: 'general_contractor',
      email: 'info@acmeconstruction.com',
      phone: '+1-555-100-0000',
      address: '123 Builder Lane, Construction City, CA 90210',
      website: 'https://acmeconstruction.com',
    });

    console.log(`✅ Created organization: ${organization.name}\n`);

    // ========================================
    // SEED ORGANIZATION MEMBERS
    // ========================================
    console.log('👥 Creating organization members...');

    await orgMemberRepo.save([
      {
        organizationId: organization.id,
        userId: users[1].id, // John Smith
        role: OrganizationRole.OWNER,
        isActive: true,
      },
      {
        organizationId: organization.id,
        userId: users[2].id, // Sarah Johnson
        role: OrganizationRole.ORG_ADMIN,
        isActive: true,
      },
      {
        organizationId: organization.id,
        userId: users[3].id, // Mike Davis
        role: OrganizationRole.ORG_MEMBER,
        isActive: true,
      },
      {
        organizationId: organization.id,
        userId: users[4].id, // Emily Brown
        role: OrganizationRole.ORG_MEMBER,
        isActive: true,
      },
    ]);

    console.log('✅ Created organization members\n');

    // ========================================
    // SEED PROJECT WITH BUDGET
    // ========================================
    console.log('🏗️  Creating project...');

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const totalBudget = 5000000;

    const project = await projectRepo.save({
      organizationId: organization.id,
      number: 'P-2024-001',
      name: 'Downtown Office Tower',
      code: 'DOT-2024',
      description: '20-story mixed-use commercial building in downtown district',
      address: '456 Main Street',
      city: 'Downtown',
      state: 'CA',
      zip: '90211',
      type: ProjectType.COMMERCIAL,
      status: ProjectStatus.CONSTRUCTION,
      startDate,
      endDate,
      settings: {
        budget: totalBudget,
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
    } as any);

    console.log(`✅ Created project: ${project.name}\n`);

    // ========================================
    // SEED PROJECT MEMBERS
    // ========================================
    console.log('👥 Creating project members...');

    await projectMemberRepo.save([
      {
        projectId: project.id,
        userId: users[1].id, // John Smith - Project Manager
        role: ProjectRole.PROJECT_MANAGER,
        isActive: true,
      },
      {
        projectId: project.id,
        userId: users[2].id, // Sarah Johnson - Site Superintendent
        role: ProjectRole.SUPERINTENDENT,
        isActive: true,
      },
      {
        projectId: project.id,
        userId: users[3].id, // Mike Davis - Project Engineer
        role: ProjectRole.PROJECT_ENGINEER,
        isActive: true,
      },
      {
        projectId: project.id,
        userId: users[4].id, // Emily Brown - Quality Inspector
        role: ProjectRole.INSPECTOR,
        isActive: true,
      },
    ]);

    console.log('✅ Created project members\n');

    // ========================================
    // SEED PROJECT PHASES
    // ========================================
    console.log('📅 Creating project phases...');

    const phases = await phaseRepo.save([
      {
        projectId: project.id,
        name: 'Site Preparation',
        description: 'Site clearing, excavation, and foundation preparation',
        order: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-15'),
        actualStartDate: new Date('2024-01-01'),
        actualEndDate: new Date('2024-02-10'),
        percentComplete: 100,
        status: PhaseStatus.COMPLETED,
        budgetedCost: totalBudget * 0.1,
        actualCost: totalBudget * 0.095,
      } as any,
      {
        projectId: project.id,
        name: 'Foundation',
        description: 'Concrete foundation, basement, and structural supports',
        order: 2,
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-04-01'),
        actualStartDate: new Date('2024-02-10'),
        actualEndDate: null,
        percentComplete: 75,
        status: PhaseStatus.IN_PROGRESS,
        budgetedCost: totalBudget * 0.15,
        actualCost: totalBudget * 0.12,
      } as any,
      {
        projectId: project.id,
        name: 'Structural Framing',
        description: 'Steel and concrete structural framework',
        order: 3,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-06-15'),
        actualStartDate: null,
        actualEndDate: null,
        percentComplete: 0,
        status: PhaseStatus.NOT_STARTED,
        budgetedCost: totalBudget * 0.25,
        actualCost: 0,
      } as any,
      {
        projectId: project.id,
        name: 'MEP Installation',
        description: 'Mechanical, electrical, and plumbing systems',
        order: 4,
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-09-01'),
        actualStartDate: null,
        actualEndDate: null,
        percentComplete: 0,
        status: PhaseStatus.NOT_STARTED,
        budgetedCost: totalBudget * 0.2,
        actualCost: 0,
      } as any,
      {
        projectId: project.id,
        name: 'Interior Finishes',
        description: 'Drywall, flooring, painting, and fixtures',
        order: 5,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-11-15'),
        actualStartDate: null,
        actualEndDate: null,
        percentComplete: 0,
        status: PhaseStatus.NOT_STARTED,
        budgetedCost: totalBudget * 0.2,
        actualCost: 0,
      } as any,
      {
        projectId: project.id,
        name: 'Final Commissioning',
        description: 'Testing, inspections, and project closeout',
        order: 6,
        startDate: new Date('2024-11-15'),
        endDate: new Date('2024-12-31'),
        actualStartDate: null,
        actualEndDate: null,
        percentComplete: 0,
        status: PhaseStatus.NOT_STARTED,
        budgetedCost: totalBudget * 0.1,
        actualCost: 0,
      } as any,
    ]);

    console.log(`✅ Created ${phases.length} project phases\n`);

    // ========================================
    // UPDATE PROJECT PROGRESS
    // ========================================
    console.log('📊 Calculating project progress...');

    // Calculate average progress from all phases
    // Phase 1: 100%, Phase 2: 75%, Phases 3-6: 0%
    const phaseProgressValues = [100, 75, 0, 0, 0, 0];
    const totalProgress = phaseProgressValues.reduce((sum, val) => sum + val, 0);
    const averageProgress = Math.round(totalProgress / phaseProgressValues.length);

    // Update project with calculated progress
    await projectRepo.update(project.id, {
      percentComplete: averageProgress,
    });

    console.log(`✅ Project progress set to ${averageProgress}%\n`);

    // ========================================
    // SEED PROJECT MILESTONES
    // ========================================
    console.log('🎯 Creating project milestones...');

    await milestoneRepo.save([
      {
        projectId: project.id,
        phaseId: phases[0].id,
        name: 'Site Ready for Construction',
        description: 'Site clearing complete, permits approved',
        plannedDate: new Date('2024-02-15'),
        actualDate: new Date('2024-02-10'),
        status: MilestoneStatus.ACHIEVED,
        order: 1,
      } as any,
      {
        projectId: project.id,
        phaseId: phases[1].id,
        name: 'Foundation Complete',
        description: 'All foundation work completed and inspected',
        plannedDate: new Date('2024-04-01'),
        actualDate: null,
        status: MilestoneStatus.PENDING,
        order: 2,
      } as any,
      {
        projectId: project.id,
        phaseId: phases[2].id,
        name: 'Structural Frame Complete',
        description: 'Building structure topped out',
        plannedDate: new Date('2024-06-15'),
        actualDate: null,
        status: MilestoneStatus.PENDING,
        order: 3,
      } as any,
      {
        projectId: project.id,
        phaseId: phases[3].id,
        name: 'MEP Rough-In Complete',
        description: 'All MEP systems installed and ready for finishes',
        plannedDate: new Date('2024-09-01'),
        actualDate: null,
        status: MilestoneStatus.PENDING,
        order: 4,
      } as any,
      {
        projectId: project.id,
        phaseId: phases[4].id,
        name: 'Interior Finishes Complete',
        description: 'All interior spaces finished',
        plannedDate: new Date('2024-11-15'),
        actualDate: null,
        status: MilestoneStatus.PENDING,
        order: 5,
      } as any,
      {
        projectId: project.id,
        phaseId: phases[5].id,
        name: 'Final Inspection Approved',
        description: 'Building ready for occupancy',
        plannedDate: new Date('2024-12-31'),
        actualDate: null,
        status: MilestoneStatus.PENDING,
        order: 6,
      } as any,
    ]);

    console.log('✅ Created project milestones\n');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('✅ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Organizations: 1`);
    console.log(`   - Projects: 1`);
    console.log(`   - Phases: ${phases.length}`);
    console.log(`   - Milestones: 6`);
    console.log(`   - Project Budget: $${totalBudget.toLocaleString()}`);
    console.log('\n🔐 Test Credentials:');
    console.log('   - admin@bobbuilder.com / Admin123!');
    console.log('   - john.smith@acme.com / Password123! (Project Manager)');
    console.log('   - sarah.johnson@acme.com / Password123! (Superintendent)');
    console.log(`\n🎯 Project ID: ${project.id}`);
    console.log(`   Visit: http://localhost:3001/projects/${project.id}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run seed
seedDashboard()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
