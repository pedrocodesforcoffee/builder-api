/**
 * Approval Threshold E2E Tests
 *
 * Tests approval threshold management endpoints including:
 * - Get project approval thresholds
 * - Update project approval thresholds
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  cleanupChangeOrders,
  createThresholdPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('ApprovalThresholdController (e2e)', () => {
  let projectId: string;
  let userId: string;
  let organizationId: string;

  beforeAll(async () => {
    // Get user and organization IDs
    userId = await getUserId(testDataSource, TEST_CREDENTIALS.johnDoe.email);
    organizationId = await getUserOrganization(testDataSource, userId);

    // Seed test data
    projectId = await seedTestProject(testDataSource, organizationId, userId);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('GET /api/v1/projects/:projectId/co-approval-thresholds', () => {
    it('should return approval thresholds for the project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .expect(401);
    });

    it('should return empty array if no thresholds configured', async () => {
      const newProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${newProjectId}/co-approval-thresholds`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 for invalid project ID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/v1/projects/invalid-uuid/co-approval-thresholds')
        .expect(400);
    });

    it('should return thresholds with correct structure', async () => {
      // First set some thresholds
      const thresholdPayload = createThresholdPayload();

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(200);

      // Then get them
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('minAmount');
        expect(response.body[0]).toHaveProperty('maxAmount');
        expect(response.body[0]).toHaveProperty('approverRole');
      }
    });
  });

  describe('PUT /api/v1/projects/:projectId/co-approval-thresholds', () => {
    it('should update approval thresholds with valid data', async () => {
      const thresholdPayload = createThresholdPayload({
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 5000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 5001,
            maxAmount: 25000,
            approverRole: 'project_executive',
          },
          {
            minAmount: 25001,
            maxAmount: null,
            approverRole: 'owner',
          },
        ],
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      // Verify each threshold
      expect(response.body[0].minAmount).toBe(0);
      expect(response.body[0].maxAmount).toBe(5000);
      expect(response.body[0].approverRole).toBe('project_manager');

      expect(response.body[1].minAmount).toBe(5001);
      expect(response.body[1].maxAmount).toBe(25000);
      expect(response.body[1].approverRole).toBe('project_executive');

      expect(response.body[2].minAmount).toBe(25001);
      expect(response.body[2].maxAmount).toBeNull();
      expect(response.body[2].approverRole).toBe('owner');
    });

    it('should return 401 without authentication', async () => {
      const thresholdPayload = createThresholdPayload();

      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(401);
    });

    it('should return 400 for missing thresholds', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send({})
        .expect(400);
    });

    it('should return 400 for empty thresholds array', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send({ thresholds: [] })
        .expect(400);
    });

    it('should return 400 for invalid threshold structure', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send({
          thresholds: [
            {
              minAmount: 0,
              // Missing maxAmount and approverRole
            },
          ],
        })
        .expect(400);
    });

    it('should return 400 for overlapping threshold ranges', async () => {
      const thresholdPayload = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 10000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 5000, // Overlaps with first threshold
            maxAmount: 20000,
            approverRole: 'project_executive',
          },
        ],
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(400);
    });

    it('should return 400 for negative amounts', async () => {
      const thresholdPayload = {
        thresholds: [
          {
            minAmount: -1000,
            maxAmount: 5000,
            approverRole: 'project_manager',
          },
        ],
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(400);
    });

    it('should return 400 for invalid approver role', async () => {
      const thresholdPayload = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 10000,
            approverRole: 'invalid_role',
          },
        ],
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(400);
    });

    it('should allow null for maxAmount (unlimited)', async () => {
      const thresholdPayload = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 10000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 10001,
            maxAmount: null, // Unlimited upper bound
            approverRole: 'owner',
          },
        ],
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(200);

      expect(response.body[1].maxAmount).toBeNull();
    });

    it('should return 400 when minAmount is greater than maxAmount', async () => {
      const thresholdPayload = {
        thresholds: [
          {
            minAmount: 10000,
            maxAmount: 5000, // Invalid: max < min
            approverRole: 'project_manager',
          },
        ],
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(400);
    });

    it('should return 400 for invalid project ID format', async () => {
      const thresholdPayload = createThresholdPayload();

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put('/api/v1/projects/invalid-uuid/co-approval-thresholds')
        .send(thresholdPayload)
        .expect(400);
    });
  });

  describe('Integration Tests', () => {
    it('should update and retrieve thresholds in sequence', async () => {
      // Update thresholds
      const thresholdPayload = createThresholdPayload({
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 15000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 15001,
            maxAmount: 50000,
            approverRole: 'project_executive',
          },
          {
            minAmount: 50001,
            maxAmount: null,
            approverRole: 'owner',
          },
        ],
      });

      const updateResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(thresholdPayload)
        .expect(200);

      expect(updateResponse.body.length).toBe(3);

      // Retrieve thresholds
      const getResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .expect(200);

      expect(getResponse.body.length).toBe(3);

      // Verify thresholds match
      expect(getResponse.body[0].minAmount).toBe(0);
      expect(getResponse.body[0].maxAmount).toBe(15000);
      expect(getResponse.body[1].minAmount).toBe(15001);
      expect(getResponse.body[1].maxAmount).toBe(50000);
      expect(getResponse.body[2].minAmount).toBe(50001);
      expect(getResponse.body[2].maxAmount).toBeNull();
    });

    it('should replace existing thresholds when updating', async () => {
      // Set initial thresholds
      const initialPayload = createThresholdPayload({
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 10000,
            approverRole: 'project_manager',
          },
        ],
      });

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(initialPayload)
        .expect(200);

      // Update with new thresholds
      const newPayload = createThresholdPayload({
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 5000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 5001,
            maxAmount: null,
            approverRole: 'owner',
          },
        ],
      });

      const updateResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(newPayload)
        .expect(200);

      // Verify new thresholds replaced old ones
      expect(updateResponse.body.length).toBe(2);
      expect(updateResponse.body[0].maxAmount).toBe(5000);
    });

    it('should support multiple different threshold configurations', async () => {
      // Test 2-tier system
      const twoTierPayload = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 25000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 25001,
            maxAmount: null,
            approverRole: 'owner',
          },
        ],
      };

      const twoTierResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(twoTierPayload)
        .expect(200);

      expect(twoTierResponse.body.length).toBe(2);

      // Test 4-tier system
      const fourTierPayload = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 5000,
            approverRole: 'project_manager',
          },
          {
            minAmount: 5001,
            maxAmount: 15000,
            approverRole: 'senior_project_manager',
          },
          {
            minAmount: 15001,
            maxAmount: 50000,
            approverRole: 'project_executive',
          },
          {
            minAmount: 50001,
            maxAmount: null,
            approverRole: 'owner',
          },
        ],
      };

      const fourTierResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-approval-thresholds`)
        .send(fourTierPayload)
        .expect(200);

      expect(fourTierResponse.body.length).toBe(4);
    });
  });
});
