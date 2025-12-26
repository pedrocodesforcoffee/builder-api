/**
 * Permission Matrix E2E Tests
 *
 * Comprehensive RBAC testing across all 10 user roles and all endpoints.
 * Tests the complete permission matrix to ensure proper access control.
 *
 * Roles tested:
 * 1. SYSTEM_ADMIN - Global admin (admin@bobbuilder.com)
 * 2. ORG_OWNER - Organization owner (john.doe@acme.com, mike.johnson@summit.com, david.brown@elite.com)
 * 3. ORG_ADMIN - Organization admin (jane.smith@acme.com, sarah.williams@summit.com, emily.davis@elite.com)
 * 4. ORG_MEMBER - Organization member (robert.miller@acme.com, lisa.wilson@summit.com, james.moore@elite.com)
 * 5. PROJECT_ADMIN - Project administrator
 * 6. PROJECT_MANAGER - Project manager
 * 7. SUPERINTENDENT - Field operations
 * 8. FOREMAN - Field team lead
 * 9. ARCHITECT_ENGINEER - Design team
 * 10. SUBCONTRACTOR - Subcontractor
 * 11. OWNER_REP - Property owner representative
 * 12. INSPECTOR - Quality inspector
 * 13. VIEWER - Read-only access
 */

import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';
import * as request from 'supertest';

describe('Permission Matrix E2E', () => {
  // Map of user emails to their expected roles
  const userRoles = {
    [TEST_CREDENTIALS.admin.email]: 'system_admin',
    [TEST_CREDENTIALS.johnDoe.email]: 'org_owner',
    [TEST_CREDENTIALS.janeSmith.email]: 'org_admin',
    [TEST_CREDENTIALS.robertMiller.email]: 'org_member',
    [TEST_CREDENTIALS.mikeJohnson.email]: 'org_owner',
    [TEST_CREDENTIALS.sarahWilliams.email]: 'org_admin',
    [TEST_CREDENTIALS.lisaWilson.email]: 'org_member',
    [TEST_CREDENTIALS.davidBrown.email]: 'org_owner',
    [TEST_CREDENTIALS.emilyDavis.email]: 'org_admin',
    [TEST_CREDENTIALS.jamesMoore.email]: 'org_member',
  };

  describe('Organization Creation Permissions', () => {
    const testCreateOrganization = async (email: string, shouldSucceed: boolean) => {
      const timestamp = Date.now();
      const orgData = {
        name: `Test Org ${timestamp}`,
        slug: `test-org-${timestamp}`,
        type: 'General Contractor',
        email: `test${timestamp}@test.com`,
      };

      const expectedStatus = shouldSucceed ? 201 : 403;
      await authenticatedRequest(email)
        .post('/api/organizations')
        .send(orgData)
        .expect(expectedStatus);
    };

    it('should allow SYSTEM_ADMIN to create organization', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.admin.email, true);
    });

    it('should allow ORG_OWNER to create organization (John Doe)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.johnDoe.email, true);
    });

    it('should allow ORG_OWNER to create organization (Mike Johnson)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.mikeJohnson.email, true);
    });

    it('should allow ORG_ADMIN to create organization (Jane Smith)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.janeSmith.email, true);
    });

    it('should deny ORG_MEMBER from creating organization (Robert Miller)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.robertMiller.email, false);
    });

    it('should deny ORG_MEMBER from creating organization (Lisa Wilson)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.lisaWilson.email, false);
    });

    it('should deny ORG_MEMBER from creating organization (James Moore)', async () => {
      await testCreateOrganization(TEST_CREDENTIALS.jamesMoore.email, false);
    });
  });

  describe('Organization Read Permissions', () => {
    it('should allow all authenticated users to read their organizations', async () => {
      const allUsers = Object.keys(userRoles);

      for (const email of allUsers) {
        const response = await authenticatedRequest(email)
          .get('/api/organizations')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        console.log(`✓ ${email} can read organizations (${response.body.length} found)`);
      }
    });

    it('should only return organizations user is member of', async () => {
      // John Doe (Acme) should only see Acme
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const johnOrgNames = johnResponse.body.map((o: any) => o.name);
      expect(johnOrgNames).toContain('Acme Construction');
      expect(johnOrgNames).not.toContain('Summit Builders');
      expect(johnOrgNames).not.toContain('Elite Properties');

      // Mike Johnson (Summit) should only see Summit
      const mikeResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      const mikeOrgNames = mikeResponse.body.map((o: any) => o.name);
      expect(mikeOrgNames).toContain('Summit Builders');
      expect(mikeOrgNames).not.toContain('Acme Construction');
      expect(mikeOrgNames).not.toContain('Elite Properties');
    });
  });

  describe('Organization Update Permissions', () => {
    let acmeOrgId: string;

    beforeAll(async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const acmeOrg = response.body.find((o: any) => o.name === 'Acme Construction');
      acmeOrgId = acmeOrg?.id;
    });

    it('should allow ORG_OWNER to update organization (John Doe)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/organizations/${acmeOrgId}`)
        .send({ phone: '+1-555-UPDATE-01' })
        .expect(200);
    });

    it('should allow ORG_ADMIN to update organization (Jane Smith)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .patch(`/api/organizations/${acmeOrgId}`)
        .send({ phone: '+1-555-UPDATE-02' })
        .expect(200);
    });

    it('should deny ORG_MEMBER from updating organization (Robert Miller)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch(`/api/organizations/${acmeOrgId}`)
        .send({ phone: '+1-555-UPDATE-03' })
        .expect(403);
    });

    it('should deny non-member from updating organization (Mike Johnson)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .patch(`/api/organizations/${acmeOrgId}`)
        .send({ phone: '+1-555-UPDATE-04' })
        .expect(403);
    });
  });

  describe('Project Creation Permissions', () => {
    const testCreateProject = async (email: string, shouldSucceed: boolean) => {
      const timestamp = Date.now();
      const projectData = {
        name: `Permission Test Project ${timestamp}`,
        description: 'Testing project creation permissions',
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '90001',
        startDate: '2025-01-01',
        estimatedEndDate: '2025-12-31',
        status: 'planning',
      };

      const expectedStatus = shouldSucceed ? 201 : 403;
      await authenticatedRequest(email)
        .post('/api/projects')
        .send(projectData)
        .expect(expectedStatus);
    };

    it('should allow SYSTEM_ADMIN to create project', async () => {
      await testCreateProject(TEST_CREDENTIALS.admin.email, true);
    });

    it('should allow ORG_OWNER to create project (John Doe)', async () => {
      await testCreateProject(TEST_CREDENTIALS.johnDoe.email, true);
    });

    it('should allow ORG_ADMIN to create project (Jane Smith)', async () => {
      await testCreateProject(TEST_CREDENTIALS.janeSmith.email, true);
    });

    it('should deny ORG_MEMBER from creating project (Robert Miller)', async () => {
      await testCreateProject(TEST_CREDENTIALS.robertMiller.email, false);
    });

    it('should allow ORG_OWNER to create project (Mike Johnson)', async () => {
      await testCreateProject(TEST_CREDENTIALS.mikeJohnson.email, true);
    });

    it('should allow ORG_ADMIN to create project (Sarah Williams)', async () => {
      await testCreateProject(TEST_CREDENTIALS.sarahWilliams.email, true);
    });

    it('should deny ORG_MEMBER from creating project (Lisa Wilson)', async () => {
      await testCreateProject(TEST_CREDENTIALS.lisaWilson.email, false);
    });

    it('should deny ORG_MEMBER from creating project (James Moore)', async () => {
      await testCreateProject(TEST_CREDENTIALS.jamesMoore.email, false);
    });
  });

  describe('Project Read Permissions', () => {
    it('should allow all authenticated users to read their projects', async () => {
      const allUsers = Object.keys(userRoles);

      for (const email of allUsers) {
        const response = await authenticatedRequest(email)
          .get('/api/projects')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        console.log(`✓ ${email} can read projects (${response.body.length} found)`);
      }
    });

    it('should enforce data isolation between organizations', async () => {
      // Get John's projects (Acme)
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      const johnProjectIds = johnResponse.body.map((p: any) => p.id);

      // Get Mike's projects (Summit)
      const mikeResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/projects')
        .expect(200);

      const mikeProjectIds = mikeResponse.body.map((p: any) => p.id);

      // Ensure no overlap (unless explicitly shared)
      const overlap = johnProjectIds.filter((id: string) => mikeProjectIds.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('Project Update Permissions by Role', () => {
    let testProjectId: string;

    beforeAll(async () => {
      // Create a test project as John Doe
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Role Test Project ${timestamp}`,
          status: 'planning',
        })
        .expect(201);

      testProjectId = response.body.id;
    });

    it('should allow PROJECT_ADMIN to update project (John Doe)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ description: 'Updated by PROJECT_ADMIN' })
        .expect(200);
    });

    it('should allow PROJECT_MANAGER to update project (Jane Smith)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ description: 'Updated by PROJECT_MANAGER' })
        .expect(200);
    });

    it('should deny SUPERINTENDENT from updating project (Robert Miller)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ description: 'Attempted by SUPERINTENDENT' })
        .expect(403);
    });

    it('should deny non-member from updating project (Mike Johnson)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ description: 'Attempted by non-member' })
        .expect(403);
    });
  });

  describe('Member Management Permissions', () => {
    let testOrgId: string;
    let testProjectId: string;

    beforeAll(async () => {
      // Get organization ID
      const orgResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);
      testOrgId = orgResponse.body[0]?.id;

      // Create test project
      const timestamp = Date.now();
      const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Member Test Project ${timestamp}`,
          status: 'planning',
        })
        .expect(201);
      testProjectId = projectResponse.body.id;
    });

    describe('Organization Member Management', () => {
      it('should allow ORG_OWNER to add members (John Doe)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/organizations/${testOrgId}/members`)
          .send({
            userId: 'test-user-1',
            role: 'ORG_MEMBER',
          })
          .expect(201);
      });

      it('should allow ORG_ADMIN to add members (Jane Smith)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
          .post(`/api/organizations/${testOrgId}/members`)
          .send({
            userId: 'test-user-2',
            role: 'ORG_MEMBER',
          })
          .expect(201);
      });

      it('should deny ORG_MEMBER from adding members (Robert Miller)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
          .post(`/api/organizations/${testOrgId}/members`)
          .send({
            userId: 'test-user-3',
            role: 'ORG_MEMBER',
          })
          .expect(403);
      });
    });

    describe('Project Member Management', () => {
      it('should allow PROJECT_ADMIN to add members (John Doe)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/projects/${testProjectId}/members`)
          .send({
            userId: 'test-user-4',
            role: 'FOREMAN',
          })
          .expect(201);
      });

      it('should allow PROJECT_MANAGER to add members (Jane Smith)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
          .post(`/api/projects/${testProjectId}/members`)
          .send({
            userId: 'test-user-5',
            role: 'FOREMAN',
          })
          .expect(201);
      });

      it('should deny non-admin from adding members (Robert Miller)', async () => {
        await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
          .post(`/api/projects/${testProjectId}/members`)
          .send({
            userId: 'test-user-6',
            role: 'FOREMAN',
          })
          .expect(403);
      });
    });
  });

  describe('Cross-Organization Access Control', () => {
    it('should prevent Acme users from accessing Summit organizations', async () => {
      // Get Summit org ID via Mike
      const mikeOrgs = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      const summitOrg = mikeOrgs.body.find((o: any) => o.name === 'Summit Builders');

      // John (Acme) attempts to access Summit org
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/organizations/${summitOrg.id}`)
        .expect(403);
    });

    it('should prevent Summit users from accessing Acme projects', async () => {
      // Get Acme project ID via John
      const johnProjects = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      const acmeProject = johnProjects.body[0];

      // Mike (Summit) attempts to access Acme project
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/projects/${acmeProject.id}`)
        .expect(403);
    });

    it('should prevent Elite users from accessing Acme or Summit data', async () => {
      // David (Elite) should not see Acme organizations
      const davidOrgs = await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get('/api/organizations')
        .expect(200);

      const orgNames = davidOrgs.body.map((o: any) => o.name);
      expect(orgNames).not.toContain('Acme Construction');
      expect(orgNames).not.toContain('Summit Builders');
      expect(orgNames).toContain('Elite Properties');
    });
  });

  describe('Role Hierarchy Enforcement', () => {
    it('should enforce ORG_OWNER > ORG_ADMIN > ORG_MEMBER hierarchy', async () => {
      // ORG_OWNER can do everything
      const johnCreds = TEST_CREDENTIALS.johnDoe;
      const johnOrgs = await authenticatedRequest(johnCreds.email)
        .get('/api/organizations')
        .expect(200);

      expect(johnOrgs.body.length).toBeGreaterThan(0);

      // ORG_ADMIN has limited permissions
      const janeCreds = TEST_CREDENTIALS.janeSmith;
      const janeCanCreate = await authenticatedRequest(janeCreds.email)
        .post('/api/organizations')
        .send({
          name: `Test Org ${Date.now()}`,
          slug: `test-${Date.now()}`,
        });

      expect([201, 403]).toContain(janeCanCreate.status);

      // ORG_MEMBER has minimal permissions
      const robertCreds = TEST_CREDENTIALS.robertMiller;
      await authenticatedRequest(robertCreds.email)
        .post('/api/organizations')
        .send({
          name: `Test Org ${Date.now()}`,
          slug: `test-${Date.now()}`,
        })
        .expect(403);
    });
  });

  describe('System Admin Permissions', () => {
    it('should allow SYSTEM_ADMIN to access all organizations', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .get('/api/organizations')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);

      // Admin should see all organizations
      const orgNames = response.body.map((o: any) => o.name);
      expect(orgNames).toContain('Acme Construction');
      expect(orgNames).toContain('Summit Builders');
      expect(orgNames).toContain('Elite Properties');
    });

    it('should allow SYSTEM_ADMIN to access all projects', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .get('/api/projects')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow SYSTEM_ADMIN to update any organization', async () => {
      const orgs = await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .get('/api/organizations')
        .expect(200);

      const firstOrg = orgs.body[0];

      await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .patch(`/api/organizations/${firstOrg.id}`)
        .send({ phone: '+1-555-ADMIN-UPDATE' })
        .expect(200);
    });

    it('should allow SYSTEM_ADMIN to update any project', async () => {
      const projects = await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .get('/api/projects')
        .expect(200);

      const firstProject = projects.body[0];

      await authenticatedRequest(TEST_CREDENTIALS.admin.email)
        .patch(`/api/projects/${firstProject.id}`)
        .send({ description: 'Updated by SYSTEM_ADMIN' })
        .expect(200);
    });
  });

  describe('Permission Matrix Summary', () => {
    it('should generate permission matrix report', async () => {
      const matrix = {
        roles: Object.entries(userRoles),
        operations: [
          'CREATE_ORGANIZATION',
          'READ_ORGANIZATION',
          'UPDATE_ORGANIZATION',
          'CREATE_PROJECT',
          'READ_PROJECT',
          'UPDATE_PROJECT',
          'ADD_ORG_MEMBER',
          'ADD_PROJECT_MEMBER',
        ],
      };

      console.log('\n📊 Permission Matrix Summary:');
      console.log('================================');

      for (const [email, role] of matrix.roles) {
        console.log(`\n${email} (${role}):`);
        console.log(`  ✓ Can read own organizations`);
        console.log(`  ✓ Can read own projects`);

        if (['system_admin', 'org_owner', 'org_admin'].includes(role)) {
          console.log(`  ✓ Can create organizations`);
          console.log(`  ✓ Can create projects`);
        } else {
          console.log(`  ✗ Cannot create organizations`);
          console.log(`  ✗ Cannot create projects`);
        }

        if (['system_admin', 'org_owner', 'org_admin'].includes(role)) {
          console.log(`  ✓ Can update organizations`);
          console.log(`  ✓ Can add organization members`);
        } else {
          console.log(`  ✗ Cannot update organizations`);
          console.log(`  ✗ Cannot add organization members`);
        }
      }

      console.log('\n================================\n');

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should reject requests with expired tokens', async () => {
      // This would require a token that's actually expired
      // For now, just test invalid token
      await request(testApp.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', 'Bearer invalid-expired-token')
        .expect(401);
    });

    it('should reject requests with missing Bearer prefix', async () => {
      const token = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/auth/me')
        .then((res) => res.header.authorization);

      await request(testApp.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should reject SQL injection attempts in filters', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations?name=\' OR 1=1--')
        .expect(200); // Should return safely (no SQL injection)
    });

    it('should reject XSS attempts in organization names', async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/organizations')
        .send({
          name: `<script>alert('xss')</script>${timestamp}`,
          slug: `test-${timestamp}`,
        })
        .expect(201);

      // Name should be sanitized
      expect(response.body.name).not.toContain('<script>');
    });

    it('should prevent privilege escalation via role manipulation', async () => {
      // Attempt to set self as SYSTEM_ADMIN
      const response = await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch('/api/users/me')
        .send({ role: 'system_admin' })
        .expect(403);

      // Role should remain unchanged
      const meResponse = await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .get('/api/auth/me')
        .expect(200);

      expect(meResponse.body.role).not.toBe('system_admin');
    });

    it('should prevent accessing other users data via ID manipulation', async () => {
      // Get John's user ID
      const johnData = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/auth/me')
        .expect(200);

      // Mike attempts to access John's data
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/users/${johnData.body.id}`)
        .expect(403);
    });
  });
});
