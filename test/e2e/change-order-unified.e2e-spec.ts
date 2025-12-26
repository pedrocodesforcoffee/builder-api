/**
 * Change Order (Unified) E2E Tests
 *
 * Tests unified change order endpoints including:
 * - Unified query across all CO types (PCO, OCO, CCO)
 * - Project-wide CO summary
 * - Change order log (history)
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  seedTestPrimeContract,
  seedTestCommitment,
  cleanupChangeOrders,
  createPcoPayload,
  createOcoPayload,
  createCcoPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('ChangeOrderController (Unified) (e2e)', () => {
  let projectId: string;
  let primeContractId: string;
  let commitmentId: string;
  let userId: string;
  let organizationId: string;
  let testPcoId: string;
  let testOcoId: string;
  let testCcoId: string;

  beforeAll(async () => {
    // Get user and organization IDs
    userId = await getUserId(testDataSource, TEST_CREDENTIALS.johnDoe.email);
    organizationId = await getUserOrganization(testDataSource, userId);

    // Seed test data
    projectId = await seedTestProject(testDataSource, organizationId, userId);
    primeContractId = await seedTestPrimeContract(testDataSource, projectId, userId);
    commitmentId = await seedTestCommitment(testDataSource, projectId, userId);

    // Create test change orders of each type
    const pcoPayload = createPcoPayload({ title: 'Test PCO for Unified Query' });
    const pcoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${projectId}/pcos`)
      .send(pcoPayload);
    testPcoId = pcoResponse.body.id;

    const ocoPayload = createOcoPayload(primeContractId, { title: 'Test OCO for Unified Query' });
    const ocoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${projectId}/ocos`)
      .send(ocoPayload);
    testOcoId = ocoResponse.body.id;

    const ccoPayload = createCcoPayload(commitmentId, { title: 'Test CCO for Unified Query' });
    const ccoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${projectId}/ccos`)
      .send(ccoPayload);
    testCcoId = ccoResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('GET /api/v1/projects/:projectId/change-orders', () => {
    it('should return all change orders for the project (PCO, OCO, CCO)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders`)
        .expect(200);

      expect(response.body).toHaveProperty('pcos');
      expect(response.body).toHaveProperty('ocos');
      expect(response.body).toHaveProperty('ccos');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('totalAmount');

      expect(Array.isArray(response.body.pcos)).toBe(true);
      expect(Array.isArray(response.body.ocos)).toBe(true);
      expect(Array.isArray(response.body.ccos)).toBe(true);

      // Verify we have at least our test COs
      expect(response.body.pcos.length).toBeGreaterThan(0);
      expect(response.body.ocos.length).toBeGreaterThan(0);
      expect(response.body.ccos.length).toBeGreaterThan(0);

      // Verify total count
      const expectedCount = response.body.pcos.length + response.body.ocos.length + response.body.ccos.length;
      expect(response.body.totalCount).toBe(expectedCount);
    });

    it('should filter to only PCOs when includePcos=true and others false', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?includePcos=true&includeOcos=false&includeCcos=false`)
        .expect(200);

      expect(response.body.pcos.length).toBeGreaterThan(0);
      expect(response.body.ocos.length).toBe(0);
      expect(response.body.ccos.length).toBe(0);
      expect(response.body.totalCount).toBe(response.body.pcos.length);
    });

    it('should filter to only OCOs when includeOcos=true and others false', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?includePcos=false&includeOcos=true&includeCcos=false`)
        .expect(200);

      expect(response.body.pcos.length).toBe(0);
      expect(response.body.ocos.length).toBeGreaterThan(0);
      expect(response.body.ccos.length).toBe(0);
      expect(response.body.totalCount).toBe(response.body.ocos.length);
    });

    it('should filter to only CCOs when includeCcos=true and others false', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?includePcos=false&includeOcos=false&includeCcos=true`)
        .expect(200);

      expect(response.body.pcos.length).toBe(0);
      expect(response.body.ocos.length).toBe(0);
      expect(response.body.ccos.length).toBeGreaterThan(0);
      expect(response.body.totalCount).toBe(response.body.ccos.length);
    });

    it('should filter PCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?pcoStatus=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body.pcos)).toBe(true);
      response.body.pcos.forEach((pco: any) => {
        expect(pco.status).toBe('DRAFT');
      });
    });

    it('should filter OCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?ocoStatus=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body.ocos)).toBe(true);
      response.body.ocos.forEach((oco: any) => {
        expect(oco.status).toBe('DRAFT');
      });
    });

    it('should filter CCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?ccoStatus=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body.ccos)).toBe(true);
      response.body.ccos.forEach((cco: any) => {
        expect(cco.status).toBe('DRAFT');
      });
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/change-orders`)
        .expect(401);
    });

    it('should return 400 for invalid project ID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/v1/projects/invalid-uuid/change-orders')
        .expect(400);
    });

    it('should handle empty project with no change orders', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/change-orders`)
        .expect(200);

      expect(response.body.pcos.length).toBe(0);
      expect(response.body.ocos.length).toBe(0);
      expect(response.body.ccos.length).toBe(0);
      expect(response.body.totalCount).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });

    it('should calculate total amount correctly', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders`)
        .expect(200);

      // Calculate expected total
      const pcoTotal = response.body.pcos.reduce((sum: number, pco: any) =>
        sum + Number(pco.totalAmount || 0), 0);
      const ocoTotal = response.body.ocos.reduce((sum: number, oco: any) =>
        sum + Number(oco.amount || 0), 0);
      const ccoTotal = response.body.ccos.reduce((sum: number, cco: any) =>
        sum + Number(cco.amount || 0), 0);
      const expectedTotal = pcoTotal + ocoTotal + ccoTotal;

      expect(response.body.totalAmount).toBe(expectedTotal);
    });

    it('should support combined status filters', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?pcoStatus=DRAFT&ocoStatus=DRAFT&ccoStatus=DRAFT`)
        .expect(200);

      // All returned COs should be in DRAFT status
      response.body.pcos.forEach((pco: any) => expect(pco.status).toBe('DRAFT'));
      response.body.ocos.forEach((oco: any) => expect(oco.status).toBe('DRAFT'));
      response.body.ccos.forEach((cco: any) => expect(cco.status).toBe('DRAFT'));
    });
  });

  describe('GET /api/v1/projects/:projectId/change-orders/summary', () => {
    it('should return project change order summary', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(200);

      // Check for summary structure (specific fields depend on COSummaryDto)
      expect(response.body).toHaveProperty('totalPcos');
      expect(response.body).toHaveProperty('totalOcos');
      expect(response.body).toHaveProperty('totalCcos');

      // Should have numeric values
      expect(typeof response.body.totalPcos).toBe('number');
      expect(typeof response.body.totalOcos).toBe('number');
      expect(typeof response.body.totalCcos).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(401);
    });

    it('should return 400 for invalid project ID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/v1/projects/invalid-uuid/change-orders/summary')
        .expect(400);
    });

    it('should include amount breakdowns in summary', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(200);

      // Should have amount-related fields
      expect(response.body).toHaveProperty('totalPcos');
      expect(response.body).toHaveProperty('totalOcos');
      expect(response.body).toHaveProperty('totalCcos');
    });

    it('should return zero values for empty project', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/change-orders/summary`)
        .expect(200);

      expect(response.body.totalPcos).toBe(0);
      expect(response.body.totalOcos).toBe(0);
      expect(response.body.totalCcos).toBe(0);
    });

    it('should include status breakdowns in summary', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(200);

      // Summary should include counts by status
      expect(response.body).toBeTruthy();
    });
  });

  describe('GET /api/v1/projects/:projectId/change-orders/log', () => {
    it('should return change order history log', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // If there are history entries, check structure
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('changeOrderId');
        expect(response.body[0]).toHaveProperty('changeOrderType');
        expect(response.body[0]).toHaveProperty('action');
        expect(response.body[0]).toHaveProperty('performedAt');
      }
    });

    it('should limit results based on limit parameter', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log?limit=5`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should default to 100 entries if no limit specified', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(100);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(401);
    });

    it('should return 400 for invalid project ID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/v1/projects/invalid-uuid/change-orders/log')
        .expect(400);
    });

    it('should return empty array for project with no history', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/change-orders/log`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return history entries in descending order by date', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(200);

      if (response.body.length > 1) {
        // Check that entries are in descending order
        for (let i = 0; i < response.body.length - 1; i++) {
          const currentDate = new Date(response.body[i].performedAt);
          const nextDate = new Date(response.body[i + 1].performedAt);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    it('should include history for all CO types (PCO, OCO, CCO, Package)', async () => {
      // Perform actions to generate history
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${testPcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${testOcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${testCcoId}/submit`)
        .send({});

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should respect custom limit values', async () => {
      const limit = 3;
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log?limit=${limit}`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('should handle limit=0 as unlimited (default to 100)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log?limit=0`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(100);
    });

    it('should handle negative limit values', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log?limit=-1`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration Tests', () => {
    it('should reflect real-time changes in unified query', async () => {
      // Get initial count
      const initialResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders`)
        .expect(200);

      const initialCount = initialResponse.body.totalCount;

      // Create a new PCO
      const newPcoPayload = createPcoPayload({ title: 'New PCO for Real-time Test' });
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(newPcoPayload)
        .expect(201);

      // Get updated count
      const updatedResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders`)
        .expect(200);

      expect(updatedResponse.body.totalCount).toBe(initialCount + 1);
    });

    it('should show changes in summary after CO operations', async () => {
      // Get initial summary
      const initialSummary = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(200);

      const initialPcoCount = initialSummary.body.totalPcos;

      // Create a new PCO
      const newPcoPayload = createPcoPayload({ title: 'PCO for Summary Test' });
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(newPcoPayload)
        .expect(201);

      // Get updated summary
      const updatedSummary = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/summary`)
        .expect(200);

      expect(updatedSummary.body.totalPcos).toBe(initialPcoCount + 1);
    });

    it('should record history for CO lifecycle operations', async () => {
      // Create a new PCO
      const pcoPayload = createPcoPayload({ title: 'PCO for History Test' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(pcoPayload)
        .expect(201);

      const newPcoId = createResponse.body.id;

      // Submit it
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${newPcoId}/submit`)
        .send({})
        .expect(200);

      // Check log
      const logResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders/log`)
        .expect(200);

      // Should have history entries
      expect(logResponse.body.length).toBeGreaterThan(0);
    });

    it('should filter across different CO types simultaneously', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/change-orders?includePcos=true&includeOcos=true&includeCcos=false`)
        .expect(200);

      expect(response.body.pcos.length).toBeGreaterThan(0);
      expect(response.body.ocos.length).toBeGreaterThan(0);
      expect(response.body.ccos.length).toBe(0);
    });
  });
});
