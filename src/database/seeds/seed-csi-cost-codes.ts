import { DataSource } from 'typeorm';
import { CostCode } from '../../modules/financials/entities/cost-code.entity';
import { Project } from '../../modules/projects/entities/project.entity';

/**
 * CSI MasterFormat Cost Codes Seed Script
 *
 * Seeds the database with the 50 CSI MasterFormat divisions (00-49).
 * These are industry-standard cost codes used in construction for organizing
 * specifications and cost data.
 *
 * Usage:
 * 1. Standalone: npm run seed:csi-codes
 * 2. For specific project: Set PROJECT_ID environment variable
 *
 * Example:
 * PROJECT_ID=your-project-uuid npm run seed:csi-codes
 *
 * Note: This is a seed script, not a migration. Safe to run in development.
 */

/**
 * CSI MasterFormat 2020 Division Names
 */
const CSI_DIVISIONS = [
  { division: 0, name: 'Procurement and Contracting Requirements' },
  { division: 1, name: 'General Requirements' },
  { division: 2, name: 'Existing Conditions' },
  { division: 3, name: 'Concrete' },
  { division: 4, name: 'Masonry' },
  { division: 5, name: 'Metals' },
  { division: 6, name: 'Wood, Plastics, and Composites' },
  { division: 7, name: 'Thermal and Moisture Protection' },
  { division: 8, name: 'Openings' },
  { division: 9, name: 'Finishes' },
  { division: 10, name: 'Specialties' },
  { division: 11, name: 'Equipment' },
  { division: 12, name: 'Furnishings' },
  { division: 13, name: 'Special Construction' },
  { division: 14, name: 'Conveying Equipment' },
  { division: 19, name: 'Reserved' },
  { division: 20, name: 'Reserved' },
  { division: 21, name: 'Fire Suppression' },
  { division: 22, name: 'Plumbing' },
  { division: 23, name: 'Heating, Ventilating, and Air Conditioning (HVAC)' },
  { division: 24, name: 'Reserved' },
  { division: 25, name: 'Integrated Automation' },
  { division: 26, name: 'Electrical' },
  { division: 27, name: 'Communications' },
  { division: 28, name: 'Electronic Safety and Security' },
  { division: 29, name: 'Reserved' },
  { division: 30, name: 'Reserved' },
  { division: 31, name: 'Earthwork' },
  { division: 32, name: 'Exterior Improvements' },
  { division: 33, name: 'Utilities' },
  { division: 34, name: 'Transportation' },
  { division: 35, name: 'Waterway and Marine Construction' },
  { division: 36, name: 'Reserved' },
  { division: 37, name: 'Reserved' },
  { division: 38, name: 'Reserved' },
  { division: 39, name: 'Reserved' },
  { division: 40, name: 'Process Integration' },
  { division: 41, name: 'Material Processing and Handling Equipment' },
  { division: 42, name: 'Process Heating, Cooling, and Drying Equipment' },
  { division: 43, name: 'Process Gas and Liquid Handling, Purification and Storage Equipment' },
  { division: 44, name: 'Pollution and Waste Control Equipment' },
  { division: 45, name: 'Industry-Specific Manufacturing Equipment' },
  { division: 46, name: 'Water and Wastewater Equipment' },
  { division: 47, name: 'Reserved' },
  { division: 48, name: 'Electrical Power Generation' },
  { division: 49, name: 'Reserved' },
];

async function seedCsiCostCodes() {
  console.log('🌱 Starting CSI MasterFormat cost codes seed...\n');

  // Load environment variables
  require('dotenv').config();

  const projectId = process.env.PROJECT_ID;

  // Database connection
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [CostCode, Project],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const costCodeRepo = dataSource.getRepository(CostCode);
  const projectRepo = dataSource.getRepository(Project);

  try {
    // Determine target project
    let targetProjectId: string;

    if (projectId) {
      // Use provided project ID
      console.log(`📋 Using provided project ID: ${projectId}`);
      const project = await projectRepo.findOne({ where: { id: projectId } });
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      targetProjectId = projectId;
      console.log(`✅ Found project: ${project.name}\n`);
    } else {
      // Find first project in database
      const project = await projectRepo.findOne({
        order: { createdAt: 'ASC' },
      });
      if (!project) {
        throw new Error(
          'No project found in database. Please create a project first or provide PROJECT_ID.',
        );
      }
      targetProjectId = project.id;
      console.log(`📋 No PROJECT_ID provided, using first project: ${project.name}`);
      console.log(`   Project ID: ${targetProjectId}\n`);
    }

    // Check for existing cost codes for this project
    const existingCount = await costCodeRepo.count({
      where: { projectId: targetProjectId },
    });

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing cost codes for this project.`);
      console.log('   Skipping seed to avoid duplicates.\n');
      console.log('💡 To re-seed, delete existing cost codes first or use a different project.\n');
      return;
    }

    // Create cost codes for all CSI divisions
    console.log('🏗️  Creating CSI MasterFormat division cost codes...');

    const costCodes = CSI_DIVISIONS.map((div) => {
      const code = `${div.division.toString().padStart(2, '0')}-00-00`;
      return costCodeRepo.create({
        code,
        description: div.name,
        division: div.division,
        projectId: targetProjectId,
        isActive: true,
      });
    });

    await costCodeRepo.save(costCodes);

    console.log(`✅ Created ${costCodes.length} CSI division cost codes\n`);

    // Summary
    console.log('✅ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - CSI Divisions seeded: ${costCodes.length}`);
    console.log(`   - Project ID: ${targetProjectId}`);
    console.log(`   - Code format: XX-00-00 (Division level only)`);
    console.log('\n📝 Notes:');
    console.log('   - These are division-level (top-level) cost codes');
    console.log('   - Add sub-codes (e.g., 03-30-00, 03-31-00) as needed per project');
    console.log('   - Reserved divisions included for completeness\n');

    // Sample cost codes
    console.log('📋 Sample cost codes created:');
    console.log('   00-00-00: Procurement and Contracting Requirements');
    console.log('   03-00-00: Concrete');
    console.log('   09-00-00: Finishes');
    console.log('   21-00-00: Fire Suppression');
    console.log('   26-00-00: Electrical');
    console.log('   31-00-00: Earthwork');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n✅ Database connection closed');
  }
}

// Run seed
seedCsiCostCodes()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
