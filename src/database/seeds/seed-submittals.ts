import { DataSource } from 'typeorm';
import { Submittal, SubmittalStatus } from '../../modules/submittals/entities/submittal.entity';
import { SubmittalType, SubmittalPriority } from '../../modules/submittals/enums/submittal.enums';

export async function seedSubmittals(dataSource: DataSource) {
  const submittalRepo = dataSource.getRepository(Submittal);

  console.log('🌱 Seeding submittals...');

  // Get existing projects
  const projects = await dataSource.query(
    'SELECT id, organization_id as "organizationId" FROM projects LIMIT 3'
  );

  if (projects.length === 0) {
    console.log('⚠️  No projects found. Please seed projects first.');
    return;
  }

  const project = projects[0];

  // Get admin user and organization for contractor
  const users = await dataSource.query(
    'SELECT id FROM users WHERE email = $1',
    ['admin@example.com']
  );

  const organizations = await dataSource.query(
    'SELECT id FROM organizations LIMIT 1'
  );

  if (users.length === 0) {
    console.log('⚠️  No admin user found.');
    return;
  }

  if (organizations.length === 0) {
    console.log('⚠️  No organizations found.');
    return;
  }

  const adminUserId = users[0].id;
  const contractorId = organizations[0].id;

  // Sample submittals data
  const submittalsData = [
    {
      number: 'SUB-001',
      title: 'Structural Steel Shop Drawings',
      description: 'Shop drawings for structural steel beams and columns for Building A',
      submittalType: SubmittalType.SHOP_DRAWING,
      priority: SubmittalPriority.HIGH,
      specSection: '05 12 00',
      specSectionTitle: 'Structural Steel Framing',
      status: SubmittalStatus.SUBMITTED,
      currentRevision: 0,
    },
    {
      number: 'SUB-002',
      title: 'HVAC Equipment Submittals',
      description: 'Product data for rooftop HVAC units',
      submittalType: SubmittalType.PRODUCT_DATA,
      priority: SubmittalPriority.MEDIUM,
      specSection: '23 74 00',
      specSectionTitle: 'Packaged HVAC Units',
      status: SubmittalStatus.UNDER_REVIEW,
      currentRevision: 1,
    },
    {
      number: 'SUB-003',
      title: 'Concrete Mix Design',
      description: 'Mix design for foundation concrete - 4000 PSI',
      submittalType: SubmittalType.TEST_REPORT,
      priority: SubmittalPriority.CRITICAL,
      specSection: '03 30 00',
      specSectionTitle: 'Cast-in-Place Concrete',
      status: SubmittalStatus.APPROVED,
      currentRevision: 0,
    },
    {
      number: 'SUB-004',
      title: 'Window System Samples',
      description: 'Physical samples of curtain wall system',
      submittalType: SubmittalType.SAMPLE,
      priority: SubmittalPriority.HIGH,
      specSection: '08 44 00',
      specSectionTitle: 'Curtain Wall Systems',
      status: SubmittalStatus.DRAFT,
      currentRevision: 0,
    },
    {
      number: 'SUB-005',
      title: 'Fire Protection System Product Data',
      description: 'Sprinkler heads, pipe, and fittings specifications',
      submittalType: SubmittalType.PRODUCT_DATA,
      priority: SubmittalPriority.MEDIUM,
      specSection: '21 13 00',
      specSectionTitle: 'Wet-Pipe Sprinkler Systems',
      status: SubmittalStatus.SUBMITTED,
      currentRevision: 0,
    },
    {
      number: 'SUB-006',
      title: 'Electrical Panel Schedule',
      description: 'Shop drawings for main electrical distribution panels',
      submittalType: SubmittalType.SHOP_DRAWING,
      priority: SubmittalPriority.HIGH,
      specSection: '26 24 00',
      specSectionTitle: 'Switchboards and Panelboards',
      status: SubmittalStatus.APPROVED_AS_NOTED,
      currentRevision: 1,
    },
    {
      number: 'SUB-007',
      title: 'Elevator Equipment Submittals',
      description: 'Complete elevator system specifications and certifications',
      submittalType: SubmittalType.PRODUCT_DATA,
      priority: SubmittalPriority.MEDIUM,
      specSection: '14 21 00',
      specSectionTitle: 'Electric Traction Elevators',
      status: SubmittalStatus.REVISE_RESUBMIT,
      currentRevision: 2,
    },
    {
      number: 'SUB-008',
      title: 'Roofing Material Warranty',
      description: 'Manufacturer warranty documentation for roofing system',
      submittalType: SubmittalType.CLOSEOUT,
      priority: SubmittalPriority.LOW,
      specSection: '07 50 00',
      specSectionTitle: 'Membrane Roofing',
      status: SubmittalStatus.APPROVED,
      currentRevision: 0,
    },
  ];

  // Create submittals
  let createdCount = 0;
  for (const submittalData of submittalsData) {
    const submittal = submittalRepo.create({
      ...submittalData,
      projectId: project.id,
      organizationId: project.organizationId,
      responsibleContractorId: contractorId,
      createdById: adminUserId,
      sequenceNumber: createdCount + 1,
      reviewTimeDays: 14,
    });

    await submittalRepo.save(submittal);

    createdCount++;
    console.log(`  ✓ Created submittal: ${submittal.number} - ${submittal.title}`);
  }

  console.log(`✅ Successfully seeded ${createdCount} submittals`);
}

// Standalone execution
async function runSeed() {
  console.log('🌱 Submittal Seed Script\n');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/modules/**/entities/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    await seedSubmittals(dataSource);

    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding submittals:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ Database connection closed\n');
  }
}

// Run seed
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('✨ All done!');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}
