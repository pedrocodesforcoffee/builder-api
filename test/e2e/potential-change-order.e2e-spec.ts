/**
 * Potential Change Order E2E Tests
 *
 * Tests all PCO endpoints including:
 * - CRUD operations
 * - Workflow transitions (submit, review, approve, reject)
 * - Conversion to OCO
 * - Cost tier management
 * - Recalculation
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  seedTestPrimeContract,
  cleanupChangeOrders,
  createPcoPayload,
  createCostTierPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('PotentialChangeOrderController (e2e)', () => {
  let projectId: string;
  let primeContractId: string;
  let userId: string;
  let organizationId: string;
  let createdPcoId: string;

  beforeAll(async () => {
    // Get user and organization IDs
    userId = await getUserId(testDataSource, TEST_CREDENTIALS.johnDoe.email);
    organizationId = await getUserOrganization(testDataSource, userId);

    // Seed test data
    projectId = await seedTestProject(testDataSource, organizationId, userId);
    primeContractId = await seedTestPrimeContract(testDataSource, projectId, userId);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('POST /api/v1/projects/:projectId/pcos', () => {
    it('should create a new PCO with valid data', async () => {
      const payload = createPcoPayload({
        title: 'New PCO for Testing',
        description: 'This is a test PCO',
        requestorName: 'John Doe',
        priority: 'high',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(payload.title);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.projectId).toBe(projectId);

      // Store for later tests
      createdPcoId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send({
          description: 'Missing title',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const payload = createPcoPayload();

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload)
        .expect(401);
    });

    it('should create PCO with all optional fields', async () => {
      const payload = createPcoPayload({
        title: 'PCO with all fields',
        description: 'Complete PCO',
        requestorName: 'Jane Smith',
        priority: 'low',
        dueDate: '2025-12-31',
        estimatedCost: 25000,
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload)
        .expect(201);

      expect(response.body.priority).toBe('low');
      expect(response.body.estimatedCost).toBe(25000);
    });
  });

  describe('GET /api/v1/projects/:projectId/pcos', () => {
    it('should return all PCOs for the project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should filter PCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos?status=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((pco: any) => {
        expect(pco.status).toBe('DRAFT');
      });
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pcos`)
        .expect(401);
    });

    it('should return empty array for project with no PCOs', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/pcos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/projects/:projectId/pcos/:id', () => {
    it('should return a single PCO by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos/${createdPcoId}`)
        .expect(200);

      expect(response.body.id).toBe(createdPcoId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/pcos/${createdPcoId}`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos/invalid-uuid`)
        .expect(400);
    });
  });

  describe('PUT /api/v1/projects/:projectId/pcos/:id', () => {
    it('should update PCO with valid data', async () => {
      const updatePayload = {
        title: 'Updated PCO Title',
        description: 'Updated description',
        priority: 'medium',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/pcos/${createdPcoId}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.id).toBe(createdPcoId);
      expect(response.body.title).toBe(updatePayload.title);
      expect(response.body.description).toBe(updatePayload.description);
      expect(response.body.priority).toBe(updatePayload.priority);
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/pcos/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/pcos/${createdPcoId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/pcos/${createdPcoId}`)
        .send({ priority: 'low' })
        .expect(200);

      expect(response.body.priority).toBe('low');
      // Other fields should remain unchanged
      expect(response.body.title).toBeTruthy();
    });
  });

  describe('DELETE /api/v1/projects/:projectId/pcos/:id', () => {
    let pcoToDelete: string;

    beforeEach(async () => {
      // Create a PCO to delete
      const payload = createPcoPayload({ title: 'PCO to Delete' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      pcoToDelete = response.body.id;
    });

    it('should delete a PCO', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/pcos/${pcoToDelete}`)
        .expect(204);

      // Verify deletion
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos/${pcoToDelete}`)
        .expect(404);
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/pcos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/pcos/${pcoToDelete}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/submit', () => {
    let draftPcoId: string;

    beforeEach(async () => {
      // Create a draft PCO
      const payload = createPcoPayload({ title: 'PCO to Submit' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      draftPcoId = response.body.id;
    });

    it('should submit a PCO from DRAFT to SUBMITTED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${draftPcoId}/submit`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.submittedAt).toBeTruthy();
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/submit`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${draftPcoId}/submit`)
        .send({})
        .expect(401);
    });

    it('should reject invalid status transition', async () => {
      // Submit first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${draftPcoId}/submit`)
        .send({});

      // Try to submit again
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${draftPcoId}/submit`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/review', () => {
    let submittedPcoId: string;

    beforeEach(async () => {
      // Create and submit a PCO
      const payload = createPcoPayload({ title: 'PCO for Review' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      submittedPcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${submittedPcoId}/submit`)
        .send({});
    });

    it('should mark PCO as UNDER_REVIEW', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${submittedPcoId}/review`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('UNDER_REVIEW');
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/review`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${submittedPcoId}/review`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/approve', () => {
    let reviewPcoId: string;

    beforeEach(async () => {
      // Create, submit, and mark under review
      const payload = createPcoPayload({ title: 'PCO to Approve' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      reviewPcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/review`)
        .send({});
    });

    it('should approve a PCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/approve`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.approvedAt).toBeTruthy();
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/approve`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/approve`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/reject', () => {
    let reviewPcoId: string;

    beforeEach(async () => {
      // Create, submit, and mark under review
      const payload = createPcoPayload({ title: 'PCO to Reject' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      reviewPcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/review`)
        .send({});
    });

    it('should reject a PCO with reason', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/reject`)
        .send({ reason: 'Cost too high' })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejectedAt).toBeTruthy();
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(401);
    });

    it('should require rejection reason', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${reviewPcoId}/reject`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/convert-to-oco', () => {
    let approvedPcoId: string;

    beforeEach(async () => {
      // Create and approve a PCO
      const payload = createPcoPayload({ title: 'PCO to Convert' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      approvedPcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/review`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/approve`)
        .send({});
    });

    it('should convert approved PCO to OCO', async () => {
      const convertPayload = {
        primeContractId,
        ocoTitle: 'Converted OCO',
        changeOrderNumber: 'OCO-999',
        amount: 50000,
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/convert-to-oco`)
        .send(convertPayload)
        .expect(201);

      expect(response.body).toHaveProperty('oco');
      expect(response.body.oco.title).toBe(convertPayload.ocoTitle);
      expect(response.body.oco.amount).toBe(convertPayload.amount);
      expect(response.body.oco.primeContractId).toBe(primeContractId);

      // PCO should be marked as converted
      const pcoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}`)
        .expect(200);

      expect(pcoResponse.body.status).toBe('CONVERTED');
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/convert-to-oco`)
        .send({
          primeContractId,
          ocoTitle: 'Test',
          changeOrderNumber: 'OCO-1',
          amount: 10000,
        })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/convert-to-oco`)
        .send({
          primeContractId,
          ocoTitle: 'Test',
          changeOrderNumber: 'OCO-1',
          amount: 10000,
        })
        .expect(401);
    });

    it('should return 400 for missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${approvedPcoId}/convert-to-oco`)
        .send({ ocoTitle: 'Test' })
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/pcos/:id/recalculate', () => {
    let pcoWithTiersId: string;

    beforeEach(async () => {
      // Create a PCO
      const payload = createPcoPayload({ title: 'PCO for Recalculation' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload);

      pcoWithTiersId = createResponse.body.id;
    });

    it('should recalculate PCO totals', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoWithTiersId}/recalculate`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('id');
    });

    it('should return 404 for non-existent PCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${fakeId}/recalculate`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/pcos/${pcoWithTiersId}/recalculate`)
        .send({})
        .expect(401);
    });
  });

  describe('Workflow Integration Tests', () => {
    it('should complete full PCO lifecycle: create -> submit -> review -> approve', async () => {
      // Create
      const payload = createPcoPayload({ title: 'Full Lifecycle PCO' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload)
        .expect(201);

      const pcoId = createResponse.body.id;
      expect(createResponse.body.status).toBe('DRAFT');

      // Submit
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/submit`)
        .send({})
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');

      // Review
      const reviewResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/review`)
        .send({})
        .expect(200);

      expect(reviewResponse.body.status).toBe('UNDER_REVIEW');

      // Approve
      const approveResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/approve`)
        .send({})
        .expect(200);

      expect(approveResponse.body.status).toBe('APPROVED');
    });

    it('should handle rejection workflow: create -> submit -> review -> reject', async () => {
      // Create
      const payload = createPcoPayload({ title: 'PCO for Rejection' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos`)
        .send(payload)
        .expect(201);

      const pcoId = createResponse.body.id;

      // Submit
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/submit`)
        .send({})
        .expect(200);

      // Review
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/review`)
        .send({})
        .expect(200);

      // Reject
      const rejectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/pcos/${pcoId}/reject`)
        .send({ reason: 'Not feasible' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('REJECTED');
    });
  });
});
