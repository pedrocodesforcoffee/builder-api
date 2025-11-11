import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrganizationMember } from '../../modules/organizations/entities/organization-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { SystemRole } from '../../modules/users/enums/system-role.enum';
import { OrganizationRole } from '../../modules/users/enums/organization-role.enum';
import { ProjectRole } from '../../modules/users/enums/project-role.enum';
import { ProjectStatus } from '../../modules/projects/enums/project-status.enum';
import { ProjectType } from '../../modules/projects/enums/project-type.enum';

/**
 * Database Seed Script
 *
 * Populates the database with sample data:
 * - 10 users with various system roles
 * - 3 organizations (General Contractor, Subcontractor, Owner)
 * - 5 projects across organizations
 * - Organization memberships
 * - Project memberships with construction roles
 *
 * Usage:
 * npm run seed
 */

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  systemRole: SystemRole;
}

interface SeedOrganization {
  name: string;
  slug: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

interface SeedProject {
  organizationSlug: string;
  name: string;
  number: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
}

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Load environment variables
  require('dotenv').config();

  // Database connection
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Organization, OrganizationMember, Project, ProjectMember],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const orgMemberRepo = dataSource.getRepository(OrganizationMember);
  const projectRepo = dataSource.getRepository(Project);
  const projectMemberRepo = dataSource.getRepository(ProjectMember);

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    // Use raw SQL with CASCADE to handle foreign key constraints
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

    const seedUsers: SeedUser[] = [
      {
        email: 'admin@bobbuilder.com',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Admin',
        phoneNumber: '+1-555-000-0001',
        systemRole: SystemRole.SYSTEM_ADMIN,
      },
      {
        email: 'john.doe@acme.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-100-0001',
        systemRole: SystemRole.USER,
      },
      {
        email: 'jane.smith@acme.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1-555-100-0002',
        systemRole: SystemRole.USER,
      },
      {
        email: 'mike.johnson@summit.com',
        password: 'Password123!',
        firstName: 'Mike',
        lastName: 'Johnson',
        phoneNumber: '+1-555-200-0001',
        systemRole: SystemRole.USER,
      },
      {
        email: 'sarah.williams@summit.com',
        password: 'Password123!',
        firstName: 'Sarah',
        lastName: 'Williams',
        phoneNumber: '+1-555-200-0002',
        systemRole: SystemRole.USER,
      },
      {
        email: 'david.brown@elite.com',
        password: 'Password123!',
        firstName: 'David',
        lastName: 'Brown',
        phoneNumber: '+1-555-300-0001',
        systemRole: SystemRole.USER,
      },
      {
        email: 'emily.davis@elite.com',
        password: 'Password123!',
        firstName: 'Emily',
        lastName: 'Davis',
        phoneNumber: '+1-555-300-0002',
        systemRole: SystemRole.USER,
      },
      {
        email: 'robert.miller@acme.com',
        password: 'Password123!',
        firstName: 'Robert',
        lastName: 'Miller',
        phoneNumber: '+1-555-100-0003',
        systemRole: SystemRole.USER,
      },
      {
        email: 'lisa.wilson@summit.com',
        password: 'Password123!',
        firstName: 'Lisa',
        lastName: 'Wilson',
        phoneNumber: '+1-555-200-0003',
        systemRole: SystemRole.USER,
      },
      {
        email: 'james.moore@elite.com',
        password: 'Password123!',
        firstName: 'James',
        lastName: 'Moore',
        phoneNumber: '+1-555-300-0003',
        systemRole: SystemRole.USER,
      },
    ];

    const users: User[] = [];
    for (const seedUser of seedUsers) {
      const hashedPassword = await bcrypt.hash(seedUser.password, 10);
      const user = userRepo.create({
        ...seedUser,
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
      });
      const savedUser = await userRepo.save(user);
      users.push(savedUser);
      console.log(`  ✓ Created user: ${savedUser.email} (${savedUser.systemRole})`);
    }
    console.log(`✅ Created ${users.length} users\n`);

    // ========================================
    // SEED ORGANIZATIONS
    // ========================================
    console.log('🏢 Creating organizations...');

    const seedOrganizations: SeedOrganization[] = [
      {
        name: 'Acme Construction',
        slug: 'acme-construction',
        type: 'General Contractor',
        email: 'info@acme-construction.com',
        phone: '+1-555-100-0000',
        address: '123 Builder Ave, New York, NY 10001',
        website: 'https://acme-construction.com',
      },
      {
        name: 'Summit Builders',
        slug: 'summit-builders',
        type: 'Subcontractor',
        email: 'contact@summitbuilders.com',
        phone: '+1-555-200-0000',
        address: '456 Construction Blvd, Los Angeles, CA 90001',
        website: 'https://summitbuilders.com',
      },
      {
        name: 'Elite Properties',
        slug: 'elite-properties',
        type: 'Owner',
        email: 'info@eliteproperties.com',
        phone: '+1-555-300-0000',
        address: '789 Property Lane, Chicago, IL 60601',
        website: 'https://eliteproperties.com',
      },
    ];

    const organizations: Organization[] = [];
    for (let i = 0; i < seedOrganizations.length; i++) {
      const seedOrg = seedOrganizations[i];
      const org = orgRepo.create({
        ...seedOrg,
        isActive: true,
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
        },
      });
      const savedOrg = await orgRepo.save(org);
      organizations.push(savedOrg);
      console.log(`  ✓ Created organization: ${savedOrg.name} (${savedOrg.type})`);

      // Add organization members
      // Index 0: admin (not assigned to orgs)
      // Index 1,2,7: Acme Construction
      // Index 3,4,8: Summit Builders
      // Index 5,6,9: Elite Properties
      const memberMappings = [
        { userIndex: 1, role: OrganizationRole.OWNER }, // John Doe - Owner
        { userIndex: 2, role: OrganizationRole.ORG_ADMIN }, // Jane Smith - Admin
        { userIndex: 7, role: OrganizationRole.ORG_MEMBER }, // Robert Miller - Member
      ];

      if (i === 1) {
        // Summit Builders
        memberMappings[0] = { userIndex: 3, role: OrganizationRole.OWNER };
        memberMappings[1] = { userIndex: 4, role: OrganizationRole.ORG_ADMIN };
        memberMappings[2] = { userIndex: 8, role: OrganizationRole.ORG_MEMBER };
      } else if (i === 2) {
        // Elite Properties
        memberMappings[0] = { userIndex: 5, role: OrganizationRole.OWNER };
        memberMappings[1] = { userIndex: 6, role: OrganizationRole.ORG_ADMIN };
        memberMappings[2] = { userIndex: 9, role: OrganizationRole.ORG_MEMBER };
      }

      for (const mapping of memberMappings) {
        const member = orgMemberRepo.create({
          organizationId: savedOrg.id,
          userId: users[mapping.userIndex].id,
          role: mapping.role,
          addedByUserId: users[mapping.userIndex].id,
        });
        await orgMemberRepo.save(member);
      }
    }
    console.log(`✅ Created ${organizations.length} organizations with members\n`);

    // ========================================
    // SEED PROJECTS
    // ========================================
    console.log('🏗️  Creating projects...');

    const seedProjects: SeedProject[] = [
      {
        organizationSlug: 'acme-construction',
        name: 'Downtown Office Tower',
        number: 'ACME-2024-001',
        description: '25-story mixed-use office building in downtown Manhattan',
        address: '100 Park Avenue',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        type: ProjectType.COMMERCIAL,
        status: ProjectStatus.CONSTRUCTION,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-12-31'),
      },
      {
        organizationSlug: 'acme-construction',
        name: 'Riverside Apartments',
        number: 'ACME-2024-002',
        description: 'Luxury residential complex with 150 units',
        address: '500 Riverside Drive',
        city: 'New York',
        state: 'NY',
        zip: '10027',
        type: ProjectType.RESIDENTIAL,
        status: ProjectStatus.PRECONSTRUCTION,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2026-03-31'),
      },
      {
        organizationSlug: 'summit-builders',
        name: 'Tech Campus Phase 2',
        number: 'SUMMIT-2024-001',
        description: 'Modern office campus for tech company',
        address: '1000 Innovation Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        type: ProjectType.COMMERCIAL,
        status: ProjectStatus.CONSTRUCTION,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2025-08-31'),
      },
      {
        organizationSlug: 'elite-properties',
        name: 'Luxury Hotel Renovation',
        number: 'ELITE-2024-001',
        description: 'Complete renovation of historic 5-star hotel',
        address: '200 Michigan Avenue',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        type: ProjectType.COMMERCIAL,
        status: ProjectStatus.CONSTRUCTION,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-06-30'),
      },
      {
        organizationSlug: 'elite-properties',
        name: 'Shopping Mall Expansion',
        number: 'ELITE-2024-002',
        description: 'Adding 50,000 sq ft retail space',
        address: '750 Commerce Street',
        city: 'Chicago',
        state: 'IL',
        zip: '60607',
        type: ProjectType.COMMERCIAL,
        status: ProjectStatus.BIDDING,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-12-31'),
      },
    ];

    const projects: Project[] = [];
    for (const seedProject of seedProjects) {
      const org = organizations.find((o) => o.slug === seedProject.organizationSlug);
      if (!org) continue;

      const project = projectRepo.create({
        organizationId: org.id,
        name: seedProject.name,
        number: seedProject.number,
        description: seedProject.description,
        address: seedProject.address,
        city: seedProject.city,
        state: seedProject.state,
        zip: seedProject.zip,
        country: 'USA',
        type: seedProject.type,
        status: seedProject.status,
        startDate: seedProject.startDate,
        endDate: seedProject.endDate,
        originalContract: Math.floor(Math.random() * 10000000) + 5000000,
        currentContract: Math.floor(Math.random() * 10000000) + 5000000,
        percentComplete: Math.floor(Math.random() * 100),
      });
      const savedProject = await projectRepo.save(project);
      projects.push(savedProject);
      console.log(`  ✓ Created project: ${savedProject.name} (${savedProject.number})`);

      // Add project members with construction roles
      // Distribute all 10 ProjectRole values across projects to demonstrate each role
      const projectOwnerIndex = org.slug === 'acme-construction' ? 1 :
                                org.slug === 'summit-builders' ? 3 : 5;

      let projectMembers: Array<{ userIndex: number; role: ProjectRole }> = [];

      const projectIndex = projects.length - 1; // Current project index (0-based)

      // Project 0 (Downtown Office Tower): PROJECT_ADMIN, SUPERINTENDENT
      if (projectIndex === 0) {
        projectMembers = [
          { userIndex: 1, role: ProjectRole.PROJECT_ADMIN },      // John Doe
          { userIndex: 2, role: ProjectRole.SUPERINTENDENT },     // Jane Smith
        ];
      }
      // Project 1 (Riverside Apartments): PROJECT_ADMIN, PROJECT_MANAGER
      else if (projectIndex === 1) {
        projectMembers = [
          { userIndex: 1, role: ProjectRole.PROJECT_ADMIN },      // John Doe (owner)
          { userIndex: 2, role: ProjectRole.PROJECT_MANAGER },    // Jane Smith
        ];
      }
      // Project 2 (Tech Campus Phase 2): PROJECT_ADMIN, PROJECT_ENGINEER, FOREMAN, ARCHITECT_ENGINEER
      else if (projectIndex === 2) {
        projectMembers = [
          { userIndex: 3, role: ProjectRole.PROJECT_ADMIN },      // Mike Johnson (owner)
          { userIndex: 4, role: ProjectRole.PROJECT_ENGINEER },   // Sarah Williams
          { userIndex: 7, role: ProjectRole.FOREMAN },            // Robert Miller
          { userIndex: 8, role: ProjectRole.ARCHITECT_ENGINEER }, // Lisa Wilson
        ];
      }
      // Project 3 (Luxury Hotel Renovation): PROJECT_ADMIN, SUBCONTRACTOR, OWNER_REP
      else if (projectIndex === 3) {
        projectMembers = [
          { userIndex: 5, role: ProjectRole.PROJECT_ADMIN },      // David Brown (owner)
          { userIndex: 4, role: ProjectRole.SUBCONTRACTOR },      // Sarah Williams
          { userIndex: 8, role: ProjectRole.OWNER_REP },          // Lisa Wilson
        ];
      }
      // Project 4 (Shopping Mall Expansion): PROJECT_ADMIN, INSPECTOR, VIEWER
      else if (projectIndex === 4) {
        projectMembers = [
          { userIndex: 5, role: ProjectRole.PROJECT_ADMIN },      // David Brown (owner)
          { userIndex: 6, role: ProjectRole.INSPECTOR },          // Emily Davis
          { userIndex: 9, role: ProjectRole.VIEWER },             // James Moore
        ];
      }

      for (const pm of projectMembers) {
        const member = projectMemberRepo.create({
          projectId: savedProject.id,
          userId: users[pm.userIndex].id,
          role: pm.role,
          addedByUserId: users[projectOwnerIndex].id,
          joinedAt: new Date(),
        });
        await projectMemberRepo.save(member);
      }
    }
    console.log(`✅ Created ${projects.length} projects with members\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`  • ${users.length} users created`);
    console.log(`  • ${organizations.length} organizations created`);
    console.log(`  • ${projects.length} projects created`);
    console.log('');

    console.log('🔐 Test Credentials:');
    console.log('  System Admin:');
    console.log('    Email: admin@bobbuilder.com');
    console.log('    Password: Admin123!');
    console.log('');
    console.log('  Acme Construction (Owner):');
    console.log('    Email: john.doe@acme.com');
    console.log('    Password: Password123!');
    console.log('');
    console.log('  Summit Builders (Owner):');
    console.log('    Email: mike.johnson@summit.com');
    console.log('    Password: Password123!');
    console.log('');
    console.log('  Elite Properties (Owner):');
    console.log('    Email: david.brown@elite.com');
    console.log('    Password: Password123!');
    console.log('');

    console.log('🎯 Next Steps:');
    console.log('  1. Test authentication: POST /api/auth/login');
    console.log('  2. List organizations: GET /api/organizations');
    console.log('  3. List projects: GET /api/projects');
    console.log('  4. Create new organization/project');
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
seed()
  .then(() => {
    console.log('\n🎉 Seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
