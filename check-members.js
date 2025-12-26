const { Client } = require('pg');

async function checkMembers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'builder',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check all projects
    const projectsResult = await client.query('SELECT id, name FROM projects LIMIT 5');
    console.log(`Found ${projectsResult.rows.length} projects:`);
    projectsResult.rows.forEach(p => {
      console.log(`  - ${p.name} (${p.id})`);
    });

    if (projectsResult.rows.length > 0) {
      const projectId = projectsResult.rows[0].id;
      console.log(`\nChecking members for project: ${projectsResult.rows[0].name}`);

      // Check project members
      const membersResult = await client.query(
        `SELECT pm.*, u.name, u.email
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = $1`,
        [projectId]
      );

      console.log(`\nFound ${membersResult.rows.length} members:`);
      if (membersResult.rows.length > 0) {
        membersResult.rows.forEach(m => {
          console.log(`  - ${m.name} (${m.email}) - Role: ${m.role}`);
        });
      } else {
        console.log('  No members found for this project!');

        // Check all project_members in database
        const allMembersResult = await client.query(
          'SELECT COUNT(*) as count FROM project_members'
        );
        console.log(`\nTotal project_members in database: ${allMembersResult.rows[0].count}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMembers();
