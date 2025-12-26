/**
 * Owner Change Order E2E Tests
 *
 * Tests all OCO endpoints including:
 * - CRUD operations
 * - Workflow transitions (submit, approve, reject, execute)
 * - Cost breakdown management
 * - Document management
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  seedTestPrimeContract,
  cleanupChangeOrders,
  createOcoPayload,
  createCostBreakdownPayload,
  createDocumentPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('OwnerChangeOrderController (e2e)', () => {
  let projectId: string;
  let primeContractId: string;
  let userId: string;
  let organizationId: string;
  let createdOcoId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Get user and organization IDs
    userId = await getUserId(testDataSource, TEST_CREDENTIALS.johnDoe.email);
    organizationId = await getUserOrganization(testDataSource, userId);

    // Seed test data
    projectId = await seedTestProject(testDataSource, organizationId, userId);
    primeContractId = await seedTestPrimeContract(testDataSource, projectId, userId);

    // Create a test document ID (mock)
    testDocumentId = '00000000-0000-0000-0000-000000000001';
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('POST /api/v1/projects/:projectId/ocos', () => {
    it('should create a new OCO with valid data', async () => {
      const payload = createOcoPayload(primeContractId, {
        title: 'New OCO for Testing',
        description: 'This is a test OCO',
        amount: 75000,
        scheduleDays: 15,
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(payload.title);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.amount).toBe(payload.amount);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.primeContractId).toBe(primeContractId);
      expect(response.body.projectId).toBe(projectId);

      // Store for later tests
      createdOcoId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send({
          title: 'Missing prime contract',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const payload = createOcoPayload(primeContractId);

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(401);
    });

    it('should create OCO with all optional fields', async () => {
      const payload = createOcoPayload(primeContractId, {
        title: 'OCO with all fields',
        description: 'Complete OCO',
        amount: 100000,
        scheduleDays: 20,
        requestedBy: 'Owner',
        reason: 'Scope change',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(201);

      expect(response.body.amount).toBe(100000);
      expect(response.body.scheduleDays).toBe(20);
    });

    it('should return 400 for invalid amount', async () => {
      const payload = createOcoPayload(primeContractId, {
        amount: -1000,
      });

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/ocos', () => {
    it('should return all OCOs for the project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('amount');
    });

    it('should filter OCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos?status=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((oco: any) => {
        expect(oco.status).toBe('DRAFT');
      });
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ocos`)
        .expect(401);
    });

    it('should return empty array for project with no OCOs', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/ocos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/projects/:projectId/ocos/:id', () => {
    it('should return a single OCO by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .expect(200);

      expect(response.body.id).toBe(createdOcoId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/invalid-uuid`)
        .expect(400);
    });
  });

  describe('PUT /api/v1/projects/:projectId/ocos/:id', () => {
    it('should update OCO with valid data', async () => {
      const updatePayload = {
        title: 'Updated OCO Title',
        description: 'Updated description',
        amount: 85000,
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.id).toBe(createdOcoId);
      expect(response.body.title).toBe(updatePayload.title);
      expect(response.body.description).toBe(updatePayload.description);
      expect(response.body.amount).toBe(updatePayload.amount);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .send({ scheduleDays: 25 })
        .expect(200);

      expect(response.body.scheduleDays).toBe(25);
      // Other fields should remain unchanged
      expect(response.body.title).toBeTruthy();
    });

    it('should return 400 for invalid amount in update', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}`)
        .send({ amount: -5000 })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/ocos/:id', () => {
    let ocoToDelete: string;

    beforeEach(async () => {
      // Create an OCO to delete
      const payload = createOcoPayload(primeContractId, { title: 'OCO to Delete' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      ocoToDelete = response.body.id;
    });

    it('should delete an OCO', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ocos/${ocoToDelete}`)
        .expect(204);

      // Verify deletion
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${ocoToDelete}`)
        .expect(404);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ocos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/ocos/${ocoToDelete}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ocos/:id/submit', () => {
    let draftOcoId: string;

    beforeEach(async () => {
      // Create a draft OCO
      const payload = createOcoPayload(primeContractId, { title: 'OCO to Submit' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      draftOcoId = response.body.id;
    });

    it('should submit an OCO from DRAFT to SUBMITTED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${draftOcoId}/submit`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.submittedAt).toBeTruthy();
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${fakeId}/submit`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos/${draftOcoId}/submit`)
        .send({})
        .expect(401);
    });

    it('should reject invalid status transition', async () => {
      // Submit first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${draftOcoId}/submit`)
        .send({});

      // Try to submit again
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${draftOcoId}/submit`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/ocos/:id/approve', () => {
    let submittedOcoId: string;

    beforeEach(async () => {
      // Create and submit an OCO
      const payload = createOcoPayload(primeContractId, { title: 'OCO to Approve' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      submittedOcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/submit`)
        .send({});
    });

    it('should approve an OCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/approve`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.approvedAt).toBeTruthy();
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${fakeId}/approve`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/approve`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ocos/:id/reject', () => {
    let submittedOcoId: string;

    beforeEach(async () => {
      // Create and submit an OCO
      const payload = createOcoPayload(primeContractId, { title: 'OCO to Reject' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      submittedOcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/submit`)
        .send({});
    });

    it('should reject an OCO with reason', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/reject`)
        .send({ reason: 'Cost too high' })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejectedAt).toBeTruthy();
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${fakeId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(401);
    });

    it('should require rejection reason', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${submittedOcoId}/reject`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/ocos/:id/execute', () => {
    let approvedOcoId: string;

    beforeEach(async () => {
      // Create, submit, and approve an OCO
      const payload = createOcoPayload(primeContractId, { title: 'OCO to Execute' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      approvedOcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${approvedOcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${approvedOcoId}/approve`)
        .send({});
    });

    it('should execute an approved OCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${approvedOcoId}/execute`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('EXECUTED');
      expect(response.body.executedAt).toBeTruthy();
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${fakeId}/execute`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos/${approvedOcoId}/execute`)
        .send({})
        .expect(401);
    });

    it('should reject execution from DRAFT status', async () => {
      const payload = createOcoPayload(primeContractId, { title: 'Draft OCO' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${createResponse.body.id}/execute`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/ocos/:id/cost-breakdown', () => {
    it('should return cost breakdown for OCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/cost-breakdown`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${fakeId}/cost-breakdown`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/cost-breakdown`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:projectId/ocos/:id/cost-breakdown', () => {
    it('should update cost breakdown for OCO', async () => {
      const breakdownPayload = createCostBreakdownPayload();

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/cost-breakdown`)
        .send(breakdownPayload)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const breakdownPayload = createCostBreakdownPayload();

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${fakeId}/cost-breakdown`)
        .send(breakdownPayload)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const breakdownPayload = createCostBreakdownPayload();

      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/cost-breakdown`)
        .send(breakdownPayload)
        .expect(401);
    });

    it('should return 400 for invalid cost breakdown data', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/cost-breakdown`)
        .send({ items: [] })
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/ocos/:id/documents', () => {
    it('should return all documents for OCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${fakeId}/documents`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ocos/:id/documents', () => {
    it('should add a document to OCO', async () => {
      const documentPayload = createDocumentPayload(testDocumentId);

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .send(documentPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.documentId).toBe(testDocumentId);
    });

    it('should return 404 for non-existent OCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const documentPayload = createDocumentPayload(testDocumentId);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${fakeId}/documents`)
        .send(documentPayload)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const documentPayload = createDocumentPayload(testDocumentId);

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .send(documentPayload)
        .expect(401);
    });

    it('should return 400 for missing documentId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .send({ documentType: 'contract' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/ocos/:id/documents/:docId', () => {
    let documentId: string;

    beforeEach(async () => {
      // Add a document first
      const documentPayload = createDocumentPayload(testDocumentId);
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents`)
        .send(documentPayload);

      documentId = response.body.id;
    });

    it('should remove a document from OCO', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents/${documentId}`)
        .expect(204);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeDocId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents/${fakeDocId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/ocos/${createdOcoId}/documents/${documentId}`)
        .expect(401);
    });
  });

  describe('Workflow Integration Tests', () => {
    it('should complete full OCO lifecycle: create -> submit -> approve -> execute', async () => {
      // Create
      const payload = createOcoPayload(primeContractId, { title: 'Full Lifecycle OCO' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(201);

      const ocoId = createResponse.body.id;
      expect(createResponse.body.status).toBe('DRAFT');

      // Submit
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/submit`)
        .send({})
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');

      // Approve
      const approveResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/approve`)
        .send({})
        .expect(200);

      expect(approveResponse.body.status).toBe('APPROVED');

      // Execute
      const executeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.status).toBe('EXECUTED');
    });

    it('should handle rejection workflow: create -> submit -> reject', async () => {
      // Create
      const payload = createOcoPayload(primeContractId, { title: 'OCO for Rejection' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(201);

      const ocoId = createResponse.body.id;

      // Submit
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/submit`)
        .send({})
        .expect(200);

      // Reject
      const rejectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/reject`)
        .send({ reason: 'Not feasible' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('REJECTED');
    });

    it('should manage cost breakdown and documents together', async () => {
      // Create OCO
      const payload = createOcoPayload(primeContractId, { title: 'OCO with Breakdown' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos`)
        .send(payload)
        .expect(201);

      const ocoId = createResponse.body.id;

      // Add cost breakdown
      const breakdownPayload = createCostBreakdownPayload();
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ocos/${ocoId}/cost-breakdown`)
        .send(breakdownPayload)
        .expect(200);

      // Add document
      const documentPayload = createDocumentPayload(testDocumentId);
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ocos/${ocoId}/documents`)
        .send(documentPayload)
        .expect(201);

      // Get cost breakdown
      const breakdownResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${ocoId}/cost-breakdown`)
        .expect(200);

      expect(breakdownResponse.body.length).toBeGreaterThan(0);

      // Get documents
      const documentsResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ocos/${ocoId}/documents`)
        .expect(200);

      expect(documentsResponse.body.length).toBeGreaterThan(0);
    });
  });
});
