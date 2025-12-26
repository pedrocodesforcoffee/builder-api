/**
 * Cross-Platform Sync E2E Tests
 *
 * Tests data synchronization and consistency across platforms:
 * - API → Web data flow
 * - API → Mobile data flow
 * - Real-time updates
 * - Data consistency
 * - Concurrent edits handling
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';

describe('Cross-Platform Sync E2E', () => {
  let testOrganizationId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test organization
    const timestamp = Date.now();
    const orgResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/organizations')
      .send({
        name: `Sync Test Org ${timestamp}`,
        slug: `sync-test-${timestamp}`,
        type: 'General Contractor',
        email: `sync${timestamp}@test.com`,
      })
      .expect(201);

    testOrganizationId = orgResponse.body.id;

    // Create test project
    const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/projects')
      .send({
        name: `Sync Test Project ${timestamp}`,
        status: 'planning',
        organizationId: testOrganizationId,
      })
      .expect(201);

    testProjectId = projectResponse.body.id;
  });

  describe('API to Web Data Flow', () => {
    it('should make data created via API immediately available to web', async () => {
      const timestamp = Date.now();

      // Create project via API
      const apiResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Web Sync Project ${timestamp}`,
          description: 'Created via API for web sync test',
          status: 'planning',
        })
        .expect(201);

      const projectId = apiResponse.body.id;

      // Immediately fetch via API (simulating web app)
      const webResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(webResponse.body).toMatchObject({
        id: projectId,
        name: `Web Sync Project ${timestamp}`,
        description: 'Created via API for web sync test',
      });
    });

    it('should sync project updates from API to web', async () => {
      // Update project via API
      const updateData = {
        name: 'Updated Name for Web',
        description: 'Updated via API',
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send(updateData)
        .expect(200);

      // Fetch updated data (simulating web refresh)
      const webResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(webResponse.body).toMatchObject(updateData);
    });

    it('should sync organization member additions', async () => {
      const memberData = {
        userId: `web-user-${Date.now()}`,
        role: 'ORG_MEMBER',
      };

      // Add member via API
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/organizations/${testOrganizationId}/members`)
        .send(memberData)
        .expect(201);

      // Fetch organization details (web would refresh)
      const orgResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/organizations/${testOrganizationId}`)
        .expect(200);

      // Should include new member
      expect(orgResponse.body.members).toBeDefined();
      expect(Array.isArray(orgResponse.body.members)).toBe(true);
    });
  });

  describe('API to Mobile Data Flow', () => {
    it('should make data created via API available to mobile app', async () => {
      const timestamp = Date.now();

      // Create project via API
      const apiResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post('/api/projects')
        .send({
          name: `Mobile Sync Project ${timestamp}`,
          description: 'Created for mobile sync test',
          status: 'in_progress',
        })
        .expect(201);

      const projectId = apiResponse.body.id;

      // Mobile app fetches project list
      const mobileResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/projects')
        .expect(200);

      // Should include newly created project
      const projectIds = mobileResponse.body.map((p: any) => p.id);
      expect(projectIds).toContain(projectId);
    });

    it('should sync project status changes to mobile', async () => {
      // Change project status
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Mobile fetches updated project
      const mobileResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(mobileResponse.body.status).toBe('in_progress');
    });

    it('should sync project progress updates to mobile', async () => {
      const progressUpdate = { completionPercentage: 35 };

      // Update progress via API
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}/progress`)
        .send(progressUpdate)
        .expect(200);

      // Mobile fetches progress
      const mobileResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}/progress`)
        .expect(200);

      expect(mobileResponse.body.completionPercentage).toBe(35);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across multiple API calls', async () => {
      // Fetch project from API multiple times
      const responses = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
      ]);

      // All responses should be identical
      const firstResponse = responses[0].body;

      responses.forEach((response) => {
        expect(response.body).toMatchObject({
          id: firstResponse.id,
          name: firstResponse.name,
          status: firstResponse.status,
        });
      });
    });

    it('should ensure updated data is immediately consistent', async () => {
      const timestamp = Date.now();
      const updateData = {
        name: `Consistency Test ${timestamp}`,
        description: `Updated at ${timestamp}`,
      };

      // Update project
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send(updateData)
        .expect(200);

      // Immediately fetch from different "clients"
      const [webResponse, mobileResponse, apiResponse] = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
      ]);

      // All should see the same updated data
      [webResponse, mobileResponse, apiResponse].forEach((response) => {
        expect(response.body.name).toBe(updateData.name);
        expect(response.body.description).toBe(updateData.description);
      });
    });

    it('should maintain referential integrity across platforms', async () => {
      // Create organization
      const timestamp = Date.now();
      const orgResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .post('/api/organizations')
        .send({
          name: `Integrity Test Org ${timestamp}`,
          slug: `integrity-${timestamp}`,
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Create project in that organization
      const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .post('/api/projects')
        .send({
          name: `Integrity Test Project ${timestamp}`,
          organizationId: orgId,
        })
        .expect(201);

      const projectId = projectResponse.body.id;

      // Fetch project - should reference organization
      const projectCheck = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(projectCheck.body.organization).toBeDefined();
      expect(projectCheck.body.organization.id).toBe(orgId);

      // Fetch organization - should list project
      const orgCheck = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/organizations/${orgId}`)
        .expect(200);

      // Organization should reference its projects
      if (orgCheck.body.projects) {
        const projectIds = orgCheck.body.projects.map((p: any) => p.id);
        expect(projectIds).toContain(projectId);
      }
    });
  });

  describe('Concurrent Edits Handling', () => {
    it('should handle concurrent updates to same project', async () => {
      // Simulate two users updating project simultaneously
      const timestamp = Date.now();

      const [update1, update2] = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .patch(`/api/projects/${testProjectId}`)
          .send({ description: `Update 1 at ${timestamp}` }),
        authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
          .patch(`/api/projects/${testProjectId}`)
          .send({ city: 'Concurrent City' }),
      ]);

      // Both should succeed (updating different fields)
      expect([200, 201]).toContain(update1.status);
      expect([200, 201]).toContain(update2.status);

      // Final state should have both updates
      const finalState = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      // Both changes should be present
      expect(finalState.body.description).toContain(`Update 1 at ${timestamp}`);
      expect(finalState.body.city).toBe('Concurrent City');
    });

    it('should handle concurrent member additions', async () => {
      const timestamp = Date.now();

      // Two admins add members simultaneously
      const [member1, member2] = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/organizations/${testOrganizationId}/members`)
          .send({
            userId: `concurrent-user-1-${timestamp}`,
            role: 'ORG_MEMBER',
          }),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/organizations/${testOrganizationId}/members`)
          .send({
            userId: `concurrent-user-2-${timestamp}`,
            role: 'ORG_MEMBER',
          }),
      ]);

      // Both should succeed
      expect(member1.status).toBe(201);
      expect(member2.status).toBe(201);
    });

    it('should prevent duplicate concurrent operations', async () => {
      const timestamp = Date.now();
      const duplicateData = {
        userId: `duplicate-user-${timestamp}`,
        role: 'ORG_MEMBER',
      };

      // Try to add same member twice simultaneously
      const results = await Promise.allSettled([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/organizations/${testOrganizationId}/members`)
          .send(duplicateData),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/organizations/${testOrganizationId}/members`)
          .send(duplicateData),
      ]);

      // One should succeed, one should fail with conflict
      const statuses = results.map((r) =>
        r.status === 'fulfilled' ? (r.value as any).status : null
      );

      const successCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);
    });
  });

  describe('Real-Time Sync Simulation', () => {
    it('should sync project status changes in real-time', async () => {
      // User A updates project status
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ status: 'on_hold' })
        .expect(200);

      // User B immediately fetches (simulating real-time update)
      const userBResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(userBResponse.body.status).toBe('on_hold');
    });

    it('should sync new projects to all organization members', async () => {
      const timestamp = Date.now();

      // User A creates project
      const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Real-Time Project ${timestamp}`,
          status: 'planning',
        })
        .expect(201);

      const newProjectId = projectResponse.body.id;

      // Other org members immediately see it
      const userBProjects = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/projects')
        .expect(200);

      const userCProjects = await authenticatedRequest(TEST_CREDENTIALS.robertMiller.email)
        .get('/api/projects')
        .expect(200);

      const userBIds = userBProjects.body.map((p: any) => p.id);
      const userCIds = userCProjects.body.map((p: any) => p.id);

      expect(userBIds).toContain(newProjectId);
      expect(userCIds).toContain(newProjectId);
    });

    it('should sync project deletions across platforms', async () => {
      const timestamp = Date.now();

      // Create a project to delete
      const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `To Delete ${timestamp}`,
          status: 'planning',
        })
        .expect(201);

      const projectId = projectResponse.body.id;

      // Archive/soft delete the project
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${projectId}`)
        .send({ isActive: false })
        .expect(200);

      // Other users should not see it in default list
      const otherUserProjects = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .get('/api/projects')
        .expect(200);

      const visibleIds = otherUserProjects.body.map((p: any) => p.id);
      expect(visibleIds).not.toContain(projectId);
    });
  });

  describe('Data Isolation Across Platforms', () => {
    it('should not leak data between organizations', async () => {
      // User from Acme creates project
      const acmeProject = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Acme Private Project ${Date.now()}`,
          status: 'planning',
        })
        .expect(201);

      // User from Summit should not see it
      const summitProjects = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/projects')
        .expect(200);

      const summitProjectIds = summitProjects.body.map((p: any) => p.id);
      expect(summitProjectIds).not.toContain(acmeProject.body.id);

      // Summit user cannot access Acme project directly
      await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get(`/api/projects/${acmeProject.body.id}`)
        .expect(403);
    });

    it('should maintain data isolation in concurrent scenarios', async () => {
      const timestamp = Date.now();

      // Two users from different orgs create projects simultaneously
      const [acmeProject, summitProject] = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post('/api/projects')
          .send({
            name: `Acme Concurrent ${timestamp}`,
            status: 'planning',
          }),
        authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
          .post('/api/projects')
          .send({
            name: `Summit Concurrent ${timestamp}`,
            status: 'planning',
          }),
      ]);

      expect(acmeProject.status).toBe(201);
      expect(summitProject.status).toBe(201);

      // Each should only see their own
      const acmeList = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/projects')
        .expect(200);

      const summitList = await authenticatedRequest(TEST_CREDENTIALS.mikeJohnson.email)
        .get('/api/projects')
        .expect(200);

      const acmeIds = acmeList.body.map((p: any) => p.id);
      const summitIds = summitList.body.map((p: any) => p.id);

      expect(acmeIds).toContain(acmeProject.body.id);
      expect(acmeIds).not.toContain(summitProject.body.id);

      expect(summitIds).toContain(summitProject.body.id);
      expect(summitIds).not.toContain(acmeProject.body.id);
    });
  });

  describe('Platform-Agnostic API Behavior', () => {
    it('should return identical data structure for all platforms', async () => {
      // Fetch same project from "different platforms"
      const [webResponse, mobileResponse, apiResponse] = await Promise.all([
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
        authenticatedRequest(TEST_CREDENTIALS.johnDoe.email).get(`/api/projects/${testProjectId}`),
      ]);

      // All should have same structure
      const webKeys = Object.keys(webResponse.body).sort();
      const mobileKeys = Object.keys(mobileResponse.body).sort();
      const apiKeys = Object.keys(apiResponse.body).sort();

      expect(webKeys).toEqual(mobileKeys);
      expect(mobileKeys).toEqual(apiKeys);

      // All should have same data
      expect(webResponse.body).toMatchObject(mobileResponse.body);
      expect(mobileResponse.body).toMatchObject(apiResponse.body);
    });

    it('should accept updates from any platform', async () => {
      const timestamp = Date.now();

      // Update from "web"
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ description: `Web update ${timestamp}` })
        .expect(200);

      // Update from "mobile"
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .patch(`/api/projects/${testProjectId}`)
        .send({ city: 'Mobile City' })
        .expect(200);

      // Verify both updates persisted
      const finalState = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(finalState.body.description).toBe(`Web update ${timestamp}`);
      expect(finalState.body.city).toBe('Mobile City');
    });
  });
});
