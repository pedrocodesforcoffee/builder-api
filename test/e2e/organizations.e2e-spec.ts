/**
 * Organizations E2E Tests
 *
 * Tests all organization endpoints including:
 * - CRUD operations
 * - Member management
 * - Role-based access control
 * - Data isolation
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
  getUser,
} from './setup';

describe('Organizations E2E', () => {
  let testOrgId: string;

  describe('POST /api/organizations', () => {
    it('should create organization as authenticated user (John Doe)', async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/organizations')
        .send({
          name: `Test Construction Co ${timestamp}`,
          slug: `test-construction-${timestamp}`,
          type: 'General Contractor',
          email: `test${timestamp}@construction.com`,
          phone: '+1-555-100-9999',
          address: '123 Test St',
          website: 'https://testconstruction.com',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: expect.stringContaining('Test Construction'),
        type: 'General Contractor',
        isActive: true,
      });

      testOrgId = response.body.id;
    });

    it('should create organization with minimal data', async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .post('/api/organizations')
        .send({
          name: `Minimal Org ${timestamp}`,
          slug: `minimal-org-${timestamp}`,
          type: 'Subcontractor',
          email: `minimal${timestamp}@test.com`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toContain('Minimal Org');
    });

    it('should reject organization creation without authentication', async () => {
      await request(testApp.getHttpServer())
        .post('/api/organizations')
        .send({
          name: 'Unauthorized Org',
          type: 'General Contractor',
        })
        .expect(401);
    });

    it('should reject organization with duplicate slug', async () => {
      const timestamp = Date.now();
      const orgData = {
        name: `Duplicate Org ${timestamp}`,
        slug: 'acme-construction', // Already exists from seed
        type: 'General Contractor',
        email: `dup${timestamp}@test.com`,
      };

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .post('/api/organizations')
        .send(orgData)
        .expect(409);
    });

    it('should reject organization with missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post('/api/organizations')
        .send({
          name: 'Incomplete Org',
          // Missing type and email
        })
        .expect(400);
    });
  });

  describe('GET /api/organizations', () => {
    it('should return organizations for John Doe', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should include Acme Construction
      const acmeOrg = response.body.find((org: any) =>
        org.name === 'Acme Construction'
      );
      expect(acmeOrg).toBeDefined();
      expect(acmeOrg.type).toBe('General Contractor');
    });

    it('should return organizations for Mike Johnson', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should include Summit Builders
      const summitOrg = response.body.find((org: any) =>
        org.name === 'Summit Builders'
      );
      expect(summitOrg).toBeDefined();
      expect(summitOrg.type).toBe('Subcontractor');
    });

    it('should only return organizations user has access to', async () => {
      // Get John's orgs
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      // Get Mike's orgs
      const mikeResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      const johnOrgIds = johnResponse.body.map((org: any) => org.id);
      const mikeOrgIds = mikeResponse.body.map((org: any) => org.id);

      // Should have different organizations (no overlap in our seed data)
      const intersection = johnOrgIds.filter((id: string) => mikeOrgIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should return empty array for new user with no organizations', async () => {
      // Register new user
      const timestamp = Date.now();
      const newUserResponse = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: `newuser${timestamp}@test.com`,
          password: 'Password123!',
        })
        .expect(201);

      // Get organizations for new user
      const response = await request(testApp.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${newUserResponse.body.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should include member count in organization list', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      expect(response.body[0]).toHaveProperty('memberCount');
      expect(typeof response.body[0].memberCount).toBe('number');
      expect(response.body[0].memberCount).toBeGreaterThanOrEqual(0);
    });

    it('should include project count in organization list', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      expect(response.body[0]).toHaveProperty('projectCount');
      expect(typeof response.body[0].projectCount).toBe('number');
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return organization details for member (John Doe)', async () => {
      // Get John's organizations
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      // Get organization details
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/organizations/${orgId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: orgId,
        name: expect.any(String),
        type: expect.any(String),
        isActive: expect.any(Boolean),
      });

      // Should include members array
      expect(response.body).toHaveProperty('members');
      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should include member details in organization response', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get(`/api/organizations/${orgId}`)
        .expect(200);

      expect(response.body.members.length).toBeGreaterThan(0);

      const member = response.body.members[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('role');
      expect(member).toHaveProperty('user');
      expect(member.user).toHaveProperty('email');
      expect(member.user).toHaveProperty('firstName');
      expect(member.user).toHaveProperty('lastName');
    });

    it('should reject access to non-member organization', async () => {
      // Get John's org ID (Acme Construction)
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const acmeOrgId = johnResponse.body[0].id;

      // Try to access with Mike (Summit Builders) - different org
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/organizations/${acmeOrgId}`)
        .expect(403);
    });

    it('should reject access with invalid organization ID', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should reject access without authentication', async () => {
      await request(testApp.getHttpServer())
        .get('/api/organizations/some-id')
        .expect(401);
    });
  });

  describe('PATCH /api/organizations/:id', () => {
    it('should update organization as owner (John Doe)', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/organizations/${orgId}`)
        .send({
          phone: '+1-555-999-8888',
          website: 'https://updated-acme.com',
        })
        .expect(200);

      expect(response.body.phone).toBe('+1-555-999-8888');
      expect(response.body.website).toBe('https://updated-acme.com');
    });

    it('should update organization as admin (Jane Smith)', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .patch(`/api/organizations/${orgId}`)
        .send({
          address: '456 Updated Address',
        })
        .expect(200);

      expect(response.body.address).toBe('456 Updated Address');
    });

    it('should reject update by regular member (Robert Miller)', async () => {
      // Get org ID from John
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = johnResponse.body[0].id;

      // Try to update as regular member
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch(`/api/organizations/${orgId}`)
        .send({ phone: '+1-555-000-0000' })
        .expect(403);
    });

    it('should reject update of non-member organization', async () => {
      // Get John's org
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const acmeOrgId = johnResponse.body[0].id;

      // Try to update with Mike (different org)
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .patch(`/api/organizations/${acmeOrgId}`)
        .send({ phone: '+1-555-111-1111' })
        .expect(403);
    });

    it('should reject invalid data in update', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .patch(`/api/organizations/${orgId}`)
        .send({
          email: 'not-an-email', // Invalid email format
        })
        .expect(400);
    });
  });

  describe('POST /api/organizations/:id/members', () => {
    let newUserId: string;

    beforeAll(async () => {
      // Create a new user to add as member
      const timestamp = Date.now();
      const response = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Team',
          lastName: 'Member',
          email: `teammember${timestamp}@test.com`,
          password: 'Password123!',
        })
        .expect(201);

      newUserId = response.body.user.id;
    });

    it('should add member as organization owner', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/organizations/${orgId}/members`)
        .send({
          userId: newUserId,
          role: 'org_member',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(newUserId);
      expect(response.body.role).toBe('org_member');
    });

    it('should add member as organization admin', async () => {
      const timestamp = Date.now();
      const newUser = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Admin',
          lastName: 'Member',
          email: `adminmember${timestamp}@test.com`,
          password: 'Password123!',
        })
        .expect(201);

      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/organizations/${orgId}/members`)
        .send({
          userId: newUser.body.user.id,
          role: 'org_member',
        })
        .expect(201);
    });

    it('should reject adding member as non-admin', async () => {
      const timestamp = Date.now();
      const newUser = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: `testuser${timestamp}@test.com`,
          password: 'Password123!',
        })
        .expect(201);

      // Get org ID
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = johnResponse.body[0].id;

      // Try to add member as regular member
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .post(`/api/organizations/${orgId}/members`)
        .send({
          userId: newUser.body.user.id,
          role: 'org_member',
        })
        .expect(403);
    });

    it('should reject adding member with invalid role', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .post(`/api/organizations/${orgId}/members`)
        .send({
          userId: newUserId,
          role: 'invalid_role',
        })
        .expect(400);
    });

    it('should reject adding already existing member', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      // Get Jane's user ID (already a member)
      const janeUser = getUser(TEST_CREDENTIALS.janeSmith.email);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/organizations/${orgId}/members`)
        .send({
          userId: janeUser.id,
          role: 'org_member',
        })
        .expect(409);
    });
  });

  describe('Data Isolation', () => {
    it('should not expose other organizations in list', async () => {
      // John should only see Acme Construction
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const johnOrgNames = johnResponse.body.map((org: any) => org.name);
      expect(johnOrgNames).toContain('Acme Construction');
      expect(johnOrgNames).not.toContain('Summit Builders');
      expect(johnOrgNames).not.toContain('Elite Properties');

      // Mike should only see Summit Builders
      const mikeResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/organizations')
        .expect(200);

      const mikeOrgNames = mikeResponse.body.map((org: any) => org.name);
      expect(mikeOrgNames).toContain('Summit Builders');
      expect(mikeOrgNames).not.toContain('Acme Construction');
      expect(mikeOrgNames).not.toContain('Elite Properties');
    });

    it('should prevent cross-organization data access', async () => {
      // Get John's org ID
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const acmeOrgId = johnResponse.body[0].id;

      // David (Elite Properties) should not be able to access
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get(`/api/organizations/${acmeOrgId}`)
        .expect(403);

      // Sarah (Summit Builders) should not be able to access
      await authenticatedRequest(TEST_CREDENTIALS.sarahWilliams.email)
        .get(`/api/organizations/${acmeOrgId}`)
        .expect(403);
    });
  });

  describe('Organization Settings', () => {
    it('should include settings in organization response', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/organizations/${orgId}`)
        .expect(200);

      expect(response.body).toHaveProperty('settings');
      expect(typeof response.body.settings).toBe('object');
    });

    it('should update organization settings', async () => {
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get('/api/organizations')
        .expect(200);

      const orgId = listResponse.body[0].id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .patch(`/api/organizations/${orgId}`)
        .send({
          settings: {
            timezone: 'America/Los_Angeles',
            currency: 'USD',
          },
        })
        .expect(200);

      expect(response.body.settings.timezone).toBe('America/Los_Angeles');
      expect(response.body.settings.currency).toBe('USD');
    });
  });
});
