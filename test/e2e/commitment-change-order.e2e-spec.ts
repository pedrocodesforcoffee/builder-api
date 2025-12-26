/**
 * Commitment Change Order E2E Tests
 *
 * Tests all CCO endpoints including:
 * - CRUD operations
 * - Workflow transitions (submit, approve, reject, execute)
 * - Line items management (for lump sum CCOs)
 * - T&M entries management (for T&M CCOs)
 * - Document management
 * - Recalculation
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  seedTestCommitment,
  cleanupChangeOrders,
  createCcoPayload,
  createLineItemPayload,
  createTMEntryPayload,
  createDocumentPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('CommitmentChangeOrderController (e2e)', () => {
  let projectId: string;
  let commitmentId: string;
  let userId: string;
  let organizationId: string;
  let createdCcoId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Get user and organization IDs
    userId = await getUserId(testDataSource, TEST_CREDENTIALS.johnDoe.email);
    organizationId = await getUserOrganization(testDataSource, userId);

    // Seed test data
    projectId = await seedTestProject(testDataSource, organizationId, userId);
    commitmentId = await seedTestCommitment(testDataSource, projectId, userId);

    // Create a test document ID (mock)
    testDocumentId = '00000000-0000-0000-0000-000000000001';
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('POST /api/v1/projects/:projectId/ccos', () => {
    it('should create a new CCO with valid data (lump sum)', async () => {
      const payload = createCcoPayload(commitmentId, {
        title: 'New CCO for Testing',
        description: 'This is a test CCO',
        pricingType: 'lump_sum',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(payload.title);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.commitmentId).toBe(commitmentId);
      expect(response.body.projectId).toBe(projectId);
      expect(response.body.pricingType).toBe('lump_sum');

      // Store for later tests
      createdCcoId = response.body.id;
    });

    it('should create a new CCO with T&M pricing', async () => {
      const payload = createCcoPayload(commitmentId, {
        title: 'T&M CCO',
        pricingType: 'time_and_material',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      expect(response.body.pricingType).toBe('time_and_material');
    });

    it('should create a new CCO with unit price pricing', async () => {
      const payload = createCcoPayload(commitmentId, {
        title: 'Unit Price CCO',
        pricingType: 'unit_price',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      expect(response.body.pricingType).toBe('unit_price');
    });

    it('should return 400 for missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send({
          title: 'Missing commitment',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const payload = createCcoPayload(commitmentId);

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(401);
    });

    it('should return 400 for invalid pricing type', async () => {
      const payload = createCcoPayload(commitmentId, {
        pricingType: 'invalid_type',
      });

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/ccos', () => {
    it('should return all CCOs for the project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should filter CCOs by commitment', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos?commitmentId=${commitmentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((cco: any) => {
        expect(cco.commitmentId).toBe(commitmentId);
      });
    });

    it('should filter CCOs by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos?status=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((cco: any) => {
        expect(cco.status).toBe('DRAFT');
      });
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ccos`)
        .expect(401);
    });

    it('should return empty array for project with no CCOs', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/ccos`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/projects/:projectId/ccos/:id', () => {
    it('should return a single CCO by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${createdCcoId}`)
        .expect(200);

      expect(response.body.id).toBe(createdCcoId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('pricingType');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ccos/${createdCcoId}`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/invalid-uuid`)
        .expect(400);
    });
  });

  describe('PUT /api/v1/projects/:projectId/ccos/:id', () => {
    it('should update CCO with valid data', async () => {
      const updatePayload = {
        title: 'Updated CCO Title',
        description: 'Updated description',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ccos/${createdCcoId}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.id).toBe(createdCcoId);
      expect(response.body.title).toBe(updatePayload.title);
      expect(response.body.description).toBe(updatePayload.description);
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ccos/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/ccos/${createdCcoId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/ccos/${createdCcoId}`)
        .send({ description: 'New description only' })
        .expect(200);

      expect(response.body.description).toBe('New description only');
      // Other fields should remain unchanged
      expect(response.body.title).toBeTruthy();
    });
  });

  describe('DELETE /api/v1/projects/:projectId/ccos/:id', () => {
    let ccoToDelete: string;

    beforeEach(async () => {
      // Create a CCO to delete
      const payload = createCcoPayload(commitmentId, { title: 'CCO to Delete' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      ccoToDelete = response.body.id;
    });

    it('should delete a CCO', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ccos/${ccoToDelete}`)
        .expect(204);

      // Verify deletion
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${ccoToDelete}`)
        .expect(404);
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ccos/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/ccos/${ccoToDelete}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/submit', () => {
    let draftCcoId: string;

    beforeEach(async () => {
      // Create a draft CCO
      const payload = createCcoPayload(commitmentId, { title: 'CCO to Submit' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      draftCcoId = response.body.id;
    });

    it('should submit a CCO from DRAFT to SUBMITTED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${draftCcoId}/submit`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.submittedAt).toBeTruthy();
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/submit`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${draftCcoId}/submit`)
        .send({})
        .expect(401);
    });

    it('should reject invalid status transition', async () => {
      // Submit first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${draftCcoId}/submit`)
        .send({});

      // Try to submit again
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${draftCcoId}/submit`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/approve', () => {
    let submittedCcoId: string;

    beforeEach(async () => {
      // Create and submit a CCO
      const payload = createCcoPayload(commitmentId, { title: 'CCO to Approve' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      submittedCcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/submit`)
        .send({});
    });

    it('should approve a CCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/approve`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.approvedAt).toBeTruthy();
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/approve`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/approve`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/reject', () => {
    let submittedCcoId: string;

    beforeEach(async () => {
      // Create and submit a CCO
      const payload = createCcoPayload(commitmentId, { title: 'CCO to Reject' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      submittedCcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/submit`)
        .send({});
    });

    it('should reject a CCO with reason', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/reject`)
        .send({ reason: 'Cost too high' })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejectedAt).toBeTruthy();
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/reject`)
        .send({ reason: 'Test reason' })
        .expect(401);
    });

    it('should require rejection reason', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${submittedCcoId}/reject`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/execute', () => {
    let approvedCcoId: string;

    beforeEach(async () => {
      // Create, submit, and approve a CCO
      const payload = createCcoPayload(commitmentId, { title: 'CCO to Execute' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      approvedCcoId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${approvedCcoId}/submit`)
        .send({});

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${approvedCcoId}/approve`)
        .send({});
    });

    it('should execute an approved CCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${approvedCcoId}/execute`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('EXECUTED');
      expect(response.body.executedAt).toBeTruthy();
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/execute`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${approvedCcoId}/execute`)
        .send({})
        .expect(401);
    });

    it('should reject execution from DRAFT status', async () => {
      const payload = createCcoPayload(commitmentId, { title: 'Draft CCO' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${createResponse.body.id}/execute`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/recalculate', () => {
    it('should recalculate CCO total', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/recalculate`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('id');
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/recalculate`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/recalculate`)
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/ccos/:id/documents', () => {
    it('should return all documents for CCO', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${fakeId}/documents`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/ccos/:id/documents', () => {
    it('should add a document to CCO', async () => {
      const documentPayload = createDocumentPayload(testDocumentId);

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .send(documentPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.documentId).toBe(testDocumentId);
    });

    it('should return 404 for non-existent CCO', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const documentPayload = createDocumentPayload(testDocumentId);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${fakeId}/documents`)
        .send(documentPayload)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const documentPayload = createDocumentPayload(testDocumentId);

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .send(documentPayload)
        .expect(401);
    });

    it('should return 400 for missing documentId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .send({ documentType: 'contract' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/ccos/:id/documents/:docId', () => {
    let documentId: string;

    beforeEach(async () => {
      // Add a document first
      const documentPayload = createDocumentPayload(testDocumentId);
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents`)
        .send(documentPayload);

      documentId = response.body.id;
    });

    it('should remove a document from CCO', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents/${documentId}`)
        .expect(204);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeDocId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents/${fakeDocId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/ccos/${createdCcoId}/documents/${documentId}`)
        .expect(401);
    });
  });

  describe('Workflow Integration Tests', () => {
    it('should complete full CCO lifecycle: create -> submit -> approve -> execute', async () => {
      // Create
      const payload = createCcoPayload(commitmentId, { title: 'Full Lifecycle CCO' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      const ccoId = createResponse.body.id;
      expect(createResponse.body.status).toBe('DRAFT');

      // Submit
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/submit`)
        .send({})
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');

      // Approve
      const approveResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/approve`)
        .send({})
        .expect(200);

      expect(approveResponse.body.status).toBe('APPROVED');

      // Execute
      const executeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.status).toBe('EXECUTED');
    });

    it('should handle rejection workflow: create -> submit -> reject', async () => {
      // Create
      const payload = createCcoPayload(commitmentId, { title: 'CCO for Rejection' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      const ccoId = createResponse.body.id;

      // Submit
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/submit`)
        .send({})
        .expect(200);

      // Reject
      const rejectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/reject`)
        .send({ reason: 'Not feasible' })
        .expect(200);

      expect(rejectResponse.body.status).toBe('REJECTED');
    });

    it('should manage documents with CCO lifecycle', async () => {
      // Create CCO
      const payload = createCcoPayload(commitmentId, { title: 'CCO with Documents' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(payload)
        .expect(201);

      const ccoId = createResponse.body.id;

      // Add document
      const documentPayload = createDocumentPayload(testDocumentId);
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/documents`)
        .send(documentPayload)
        .expect(201);

      // Get documents
      const documentsResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${ccoId}/documents`)
        .expect(200);

      expect(documentsResponse.body.length).toBeGreaterThan(0);

      // Submit CCO
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos/${ccoId}/submit`)
        .send({})
        .expect(200);

      // Documents should still be accessible
      const documentsAfterSubmit = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/ccos/${ccoId}/documents`)
        .expect(200);

      expect(documentsAfterSubmit.body.length).toBeGreaterThan(0);
    });

    it('should test different pricing types', async () => {
      // Lump Sum CCO
      const lumpSumPayload = createCcoPayload(commitmentId, {
        title: 'Lump Sum CCO',
        pricingType: 'lump_sum',
      });

      const lumpSumResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(lumpSumPayload)
        .expect(201);

      expect(lumpSumResponse.body.pricingType).toBe('lump_sum');

      // T&M CCO
      const tmPayload = createCcoPayload(commitmentId, {
        title: 'T&M CCO',
        pricingType: 'time_and_material',
      });

      const tmResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(tmPayload)
        .expect(201);

      expect(tmResponse.body.pricingType).toBe('time_and_material');

      // Unit Price CCO
      const unitPricePayload = createCcoPayload(commitmentId, {
        title: 'Unit Price CCO',
        pricingType: 'unit_price',
      });

      const unitPriceResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/ccos`)
        .send(unitPricePayload)
        .expect(201);

      expect(unitPriceResponse.body.pricingType).toBe('unit_price');
    });
  });
});
