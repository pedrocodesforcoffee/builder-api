const { Client } = require('pg');

async function checkProjectMembers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'builder_api_dev',
    user: 'pperes',
  });

  const projectId = 'bbf18964-c4c3-4361-9547-cb570389664c';

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check project details
    const projectResult = await client.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      console.log('❌ Project not found!');
      return;
    }

    console.log(`Project: ${projectResult.rows[0].name} (${projectId})\n`);

    // Check project members
    const membersResult = await client.query(
      `SELECT
        pm.user_id,
        pm.project_id,
        pm.role,
        pm.created_at,
        u.id as user_table_id,
        u.first_name,
        u.last_name,
        u.email
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at`,
      [projectId]
    );

    console.log(`Found ${membersResult.rows.length} team members:\n`);

    if (membersResult.rows.length > 0) {
      membersResult.rows.forEach((m, index) => {
        console.log(`${index + 1}. ${m.first_name} ${m.last_name}`);
        console.log(`   Email: ${m.email}`);
        console.log(`   Role: ${m.role}`);
        console.log(`   User ID: ${m.user_id}`);
        console.log(`   Added: ${m.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No members found for this project!\n');

      // Check if there are any project_members at all
      const totalMembersResult = await client.query(
        'SELECT COUNT(*) as count FROM project_members'
      );
      console.log(`Total project_members in database: ${totalMembersResult.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkProjectMembers();
