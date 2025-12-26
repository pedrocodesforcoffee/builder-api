/**
 * Projects E2E Tests
 *
 * Tests all project-related endpoints including:
 * - Project creation (with RBAC)
 * - Project listing and filtering
 * - Project details retrieval
 * - Project updates (with role-based authorization)
 * - Team member management
 * - Project status transitions
 * - Data isolation
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';

describe('Projects E2E', () => {
  let testProjectId: string;

  describe('POST /api/projects', () => {
    it('should create project as GC Owner (John Doe)', async () => {
      const timestamp = Date.now();
      const projectData = {
        name: `Test Project ${timestamp}`,
        description: 'A comprehensive test project for E2E testing',
        address: '456 Construction Ave',
        city: 'Builder City',
        state: 'CA',
        zipCode: '90210',
        startDate: '2025-01-15',
        estimatedEndDate: '2025-12-31',
        status: 'planning',
        organizationId: null, // Will use default organization
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: projectData.name,
        description: projectData.description,
        address: projectData.address,
        status: 'planning',
        isActive: true,
      });

      testProjectId = response.body.id;
    });

    it('should create project as GC Admin (Jane Smith)', async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post('/api/projects')
        .send({
          name: `Admin Test Project ${timestamp}`,
          description: 'Project created by GC admin',
          address: '789 Admin Blvd',
          city: 'Admin City',
          state: 'NY',
          zipCode: '10001',
          startDate: '2025-02-01',
          estimatedEndDate: '2025-11-30',
          status: 'planning',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toContain('Admin Test Project');
    });

    it('should reject project creation by regular member (Robert Miller)', async () => {
      const timestamp = Date.now();
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .post('/api/projects')
        .send({
          name: `Unauthorized Project ${timestamp}`,
          description: 'This should fail',
          address: '123 Fail St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90001',
          startDate: '2025-01-01',
          estimatedEndDate: '2025-12-31',
          status: 'planning',
        })
        .expect(403);
    });

    it('should reject project creation without authentication', async () => {
      await request(testApp.getHttpServer())
        .post('/api/projects')
        .send({
          name: 'Unauthenticated Project',
          description: 'Should fail',
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90001',
          startDate: '2025-01-01',
          estimatedEndDate: '2025-12-31',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          // Missing name
          description: 'Missing required fields',
        })
        .expect(400);
    });

    it('should validate date formats', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: 'Invalid Date Project',
          startDate: 'invalid-date',
          estimatedEndDate: '2025-12-31',
        })
        .expect(400);
    });

    it('should validate status enum values', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: 'Invalid Status Project',
          status: 'invalid_status',
        })
        .expect(400);
    });

    it('should validate end date is after start date', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: 'Invalid Date Range Project',
          startDate: '2025-12-31',
          estimatedEndDate: '2025-01-01', // Before start date
        })
        .expect(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should return all accessible projects for John Doe', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify project structure
      const project = response.body[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('status');
      expect(project).toHaveProperty('organization');
    });

    it('should return only member-accessible projects for Mike Johnson', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/projects')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Mike should only see Summit Builders projects
      response.body.forEach((project: any) => {
        expect(['Summit Builders', 'Acme Construction']).toContain(
          project.organization?.name
        );
      });
    });

    it('should filter projects by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?status=in_progress')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned projects should have in_progress status
      response.body.forEach((project: any) => {
        expect(project.status).toBe('in_progress');
      });
    });

    it('should filter projects by organization', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?organizationId=<org-id>')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?limit=5&offset=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for user with no projects', async () => {
      // Create a new user with no project assignments
      const timestamp = Date.now();
      const registerResponse = await request(testApp.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'No',
          lastName: 'Projects',
          email: `noprojects${timestamp}@test.com`,
          password: 'Password123!',
        })
        .expect(201);

      const token = registerResponse.body.accessToken;

      const response = await request(testApp.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details for team member', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProjectId,
        name: expect.any(String),
        description: expect.any(String),
        status: expect.any(String),
      });

      // Should include team members
      expect(response.body).toHaveProperty('teamMembers');
      expect(Array.isArray(response.body.teamMembers)).toBe(true);
    });

    it('should include organization details', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('organization');
      expect(response.body.organization).toHaveProperty('id');
      expect(response.body.organization).toHaveProperty('name');
    });

    it('should reject access to non-member project', async () => {
      // David Brown from Elite Properties trying to access Acme project
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(403);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects/invalid-uuid')
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/projects/${testProjectId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project as PROJECT_ADMIN (John Doe)', async () => {
      const updates = {
        name: 'Updated Project Name',
        description: 'Updated description for the project',
        status: 'in_progress',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProjectId,
        name: updates.name,
        description: updates.description,
        status: updates.status,
      });
    });

    it('should update project as PROJECT_MANAGER (Jane Smith)', async () => {
      const updates = {
        description: 'Updated by project manager',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .patch(`/api/projects/${testProjectId}`)
        .send(updates)
        .expect(200);

      expect(response.body.description).toBe(updates.description);
    });

    it('should reject update by unauthorized role (Robert Miller)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });

    it('should validate status transitions', async () => {
      // Try to transition from in_progress to planning (invalid)
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ status: 'planning' })
        .expect(400);
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ city: 'New City Name' })
        .expect(200);

      expect(response.body.city).toBe('New City Name');
      // Other fields should remain unchanged
      expect(response.body.name).toBe('Updated Project Name');
    });

    it('should reject invalid field types', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ isActive: 'not-a-boolean' })
        .expect(400);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${fakeId}`)
        .send({ name: 'Update Non-existent' })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .patch(`/api/projects/${testProjectId}`)
        .send({ name: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add team member as PROJECT_ADMIN', async () => {
      const memberData = {
        userId: 'test-user-id',
        role: 'FOREMAN',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send(memberData)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: memberData.userId,
        role: memberData.role,
        projectId: testProjectId,
      });
    });

    it('should reject adding member as non-admin', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send({
          userId: 'test-user-id',
          role: 'FOREMAN',
        })
        .expect(403);
    });

    it('should validate role enum values', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send({
          userId: 'test-user-id',
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });

    it('should reject duplicate member assignment', async () => {
      const memberData = {
        userId: 'duplicate-user-id',
        role: 'FOREMAN',
      };

      // First addition
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send(memberData)
        .expect(201);

      // Duplicate addition
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send(memberData)
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${testProjectId}/members`)
        .send({ userId: 'test-user-id' }) // Missing role
        .expect(400);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/projects/${fakeId}/members`)
        .send({
          userId: 'test-user-id',
          role: 'FOREMAN',
        })
        .expect(404);
    });
  });

  describe('PATCH /api/projects/:id/members/:userId', () => {
    it('should update member role as PROJECT_ADMIN', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}/members/test-user-id`)
        .send({ role: 'SUPERINTENDENT' })
        .expect(200);

      expect(response.body.role).toBe('SUPERINTENDENT');
    });

    it('should reject role update by non-admin', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .patch(`/api/projects/${testProjectId}/members/test-user-id`)
        .send({ role: 'SUPERINTENDENT' })
        .expect(403);
    });

    it('should return 404 for non-existent member', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}/members/non-existent-user`)
        .send({ role: 'SUPERINTENDENT' })
        .expect(404);
    });
  });

  describe('DELETE /api/projects/:id/members/:userId', () => {
    it('should remove team member as PROJECT_ADMIN', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/projects/${testProjectId}/members/test-user-id`)
        .expect(204);
    });

    it('should reject member removal by non-admin', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .delete(`/api/projects/${testProjectId}/members/test-user-id`)
        .expect(403);
    });

    it('should return 404 for non-existent member', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/projects/${testProjectId}/members/non-existent-user`)
        .expect(404);
    });
  });

  describe('Project Status Transitions', () => {
    let statusTestProjectId: string;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Status Test Project ${timestamp}`,
          status: 'planning',
        })
        .expect(201);

      statusTestProjectId = response.body.id;
    });

    it('should transition from planning to in_progress', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${statusTestProjectId}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
    });

    it('should transition from in_progress to on_hold', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${statusTestProjectId}`)
        .send({ status: 'on_hold' })
        .expect(200);

      expect(response.body.status).toBe('on_hold');
    });

    it('should transition from on_hold to in_progress', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${statusTestProjectId}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
    });

    it('should transition from in_progress to completed', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${statusTestProjectId}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
    });
  });

  describe('Data Isolation', () => {
    it('should not allow access to other organizations projects', async () => {
      // Mike Johnson (Summit Builders) trying to access John's Acme project
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(403);
    });

    it('should not expose other organizations projects in list', async () => {
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      const johnProjectOrgs = johnResponse.body.map((p: any) => p.organization?.name);

      // Mike's projects should not appear in John's list
      const mikeResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/projects')
        .expect(200);

      const mikeProjectIds = mikeResponse.body.map((p: any) => p.id);
      const johnProjectIds = johnResponse.body.map((p: any) => p.id);

      // Ensure no overlap (unless shared projects exist)
      const overlap = mikeProjectIds.filter((id: string) => johnProjectIds.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should prevent updates to other organizations projects', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('Project Search and Filtering', () => {
    it('should search projects by name', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?search=Test')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        expect(project.name.toLowerCase()).toContain('test');
      });
    });

    it('should filter by multiple statuses', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?status=planning,in_progress')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((project: any) => {
        expect(['planning', 'in_progress']).toContain(project.status);
      });
    });

    it('should filter by date range', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?startDateAfter=2025-01-01')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should sort projects by name', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?sortBy=name&order=asc')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify sorting
      const names = response.body.map((p: any) => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('Project Progress Tracking', () => {
    it('should return project progress metrics', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}/progress`)
        .expect(200);

      expect(response.body).toHaveProperty('completionPercentage');
      expect(response.body).toHaveProperty('totalTasks');
      expect(response.body).toHaveProperty('completedTasks');
    });

    it('should update project progress', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}/progress`)
        .send({ completionPercentage: 45 })
        .expect(200);

      expect(response.body.completionPercentage).toBe(45);
    });

    it('should reject invalid progress values', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}/progress`)
        .send({ completionPercentage: 150 }) // Over 100%
        .expect(400);
    });
  });

  describe('Project Archival', () => {
    it('should archive project as PROJECT_ADMIN', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should exclude archived projects from default list', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      const archivedProjects = response.body.filter((p: any) => !p.isActive);
      expect(archivedProjects.length).toBe(0);
    });

    it('should include archived projects when requested', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects?includeArchived=true')
        .expect(200);

      const archivedProjects = response.body.filter((p: any) => !p.isActive);
      expect(archivedProjects.length).toBeGreaterThan(0);
    });

    it('should unarchive project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });
});
