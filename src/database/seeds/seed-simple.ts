import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

async function seed() {
  console.log('🌱 Starting simple database seed...\n');

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
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Create test users
    console.log('👤 Creating test users...');
    const passwordHash = await bcrypt.hash('password123', 12);

    // Admin user - check if exists first
    const existingAdmin = await dataSource.query(`SELECT id FROM users WHERE email = $1`, ['admin@example.com']);
    if (existingAdmin.length === 0) {
      await dataSource.query(`
        INSERT INTO users (email, password, first_name, last_name, system_role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@example.com', passwordHash, 'Admin', 'User', 'system_admin']);
    }

    // Regular user - check if exists first
    const existingUser = await dataSource.query(`SELECT id FROM users WHERE email = $1`, ['user@example.com']);
    if (existingUser.length === 0) {
      await dataSource.query(`
        INSERT INTO users (email, password, first_name, last_name, system_role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['user@example.com', passwordHash, 'Regular', 'User', 'user']);
    }

    console.log('✅ Test users created:');
    console.log('   - admin@example.com / password123 (system_admin)');
    console.log('   - user@example.com / password123 (user)\n');

    // Create test organization
    console.log('🏢 Creating test organization...');
    let orgResult = await dataSource.query(`SELECT id FROM organizations WHERE name = $1`, ['Test Organization']);
    if (orgResult.length === 0) {
      orgResult = await dataSource.query(`
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        RETURNING id
      `, ['Test Organization', 'test-organization']);
    }

    if (orgResult && orgResult.length > 0) {
      const orgId = orgResult[0].id;
      console.log(`✅ Organization created (ID: ${orgId})\n`);

      // Get admin user ID
      const adminUser = await dataSource.query(`
        SELECT id FROM users WHERE email = $1
      `, ['admin@example.com']);

      if (adminUser && adminUser.length > 0) {
        const adminId = adminUser[0].id;

        // Add admin to organization - check if exists
        const existingMember = await dataSource.query(`
          SELECT organization_id, user_id FROM organization_members WHERE organization_id = $1 AND user_id = $2
        `, [orgId, adminId]);
        if (existingMember.length === 0) {
          await dataSource.query(`
            INSERT INTO organization_members (organization_id, user_id, role)
            VALUES ($1, $2, $3)
          `, [orgId, adminId, 'owner']);
        }

        // Create test project - check if exists
        console.log('📁 Creating test project...');
        let projectResult = await dataSource.query(`
          SELECT id FROM projects WHERE project_number = $1
        `, ['PROJ-001']);
        if (projectResult.length === 0) {
          projectResult = await dataSource.query(`
            INSERT INTO projects (
              name, description, status, organization_id, project_number,
              start_date, target_end_date, budget
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `, [
            'Sample Construction Project',
            'A sample project for testing',
            'ACTIVE',
            orgId,
            'PROJ-001',
            new Date(),
            new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
            1000000
          ]);
        }

        if (projectResult && projectResult.length > 0) {
          const projectId = projectResult[0].id;
          console.log(`✅ Project created (ID: ${projectId})\n`);

          // Add admin as project member - check if exists
          const existingProjectMember = await dataSource.query(`
            SELECT project_id, user_id FROM project_members WHERE project_id = $1 AND user_id = $2
          `, [projectId, adminId]);
          if (existingProjectMember.length === 0) {
            await dataSource.query(`
              INSERT INTO project_members (project_id, user_id, role)
              VALUES ($1, $2, $3)
            `, [projectId, adminId, 'owner']);
          }

          console.log('✅ Admin added to project as project_manager\n');
        }
      }
    }

    console.log('✅ Seed completed successfully!\n');
    console.log('🚀 You can now log in with:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123\n');

  } catch (error) {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run seed
seed();
