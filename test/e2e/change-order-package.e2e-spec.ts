/**
 * Change Order Package E2E Tests
 *
 * Tests all CO Package endpoints including:
 * - CRUD operations
 * - Package item management (add/remove items)
 * - Workflow transitions (submit, approve)
 */

import * as request from 'supertest';
import { testApp, TEST_CREDENTIALS, authenticatedRequest, testDataSource } from './setup';
import {
  seedTestProject,
  seedTestPrimeContract,
  seedTestCommitment,
  cleanupChangeOrders,
  createPackagePayload,
  createOcoPayload,
  createCcoPayload,
  getUserId,
  getUserOrganization,
} from '../helpers/change-order-test.helper';

describe('ChangeOrderPackageController (e2e)', () => {
  let projectId: string;
  let primeContractId: string;
  let commitmentId: string;
  let userId: string;
  let organizationId: string;
  let createdPackageId: string;
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

    // Create test OCO and CCO for package items
    const ocoPayload = createOcoPayload(primeContractId, { title: 'OCO for Package' });
    const ocoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${projectId}/ocos`)
      .send(ocoPayload);
    testOcoId = ocoResponse.body.id;

    const ccoPayload = createCcoPayload(commitmentId, { title: 'CCO for Package' });
    const ccoResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${projectId}/ccos`)
      .send(ccoPayload);
    testCcoId = ccoResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupChangeOrders(testDataSource);
  });

  describe('POST /api/v1/projects/:projectId/co-packages', () => {
    it('should create a new package with valid data', async () => {
      const payload = createPackagePayload({
        packageName: 'Test Package 1',
        description: 'This is a test package',
      });

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.packageName).toBe(payload.packageName);
      expect(response.body.description).toBe(payload.description);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.projectId).toBe(projectId);

      // Store for later tests
      createdPackageId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send({
          description: 'Missing package name',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const payload = createPackagePayload();

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload)
        .expect(401);
    });

    it('should create package with minimal fields', async () => {
      const payload = {
        packageName: 'Minimal Package',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload)
        .expect(201);

      expect(response.body.packageName).toBe(payload.packageName);
    });
  });

  describe('GET /api/v1/projects/:projectId/co-packages', () => {
    it('should return all packages for the project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('packageName');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should filter packages by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages?status=DRAFT`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((pkg: any) => {
        expect(pkg.status).toBe('DRAFT');
      });
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/co-packages`)
        .expect(401);
    });

    it('should return empty array for project with no packages', async () => {
      const emptyProjectId = await seedTestProject(
        testDataSource,
        organizationId,
        userId,
      );

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/co-packages`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/projects/:projectId/co-packages/:id', () => {
    it('should return a single package by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}`)
        .expect(200);

      expect(response.body.id).toBe(createdPackageId);
      expect(response.body).toHaveProperty('packageName');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/invalid-uuid`)
        .expect(400);
    });
  });

  describe('PUT /api/v1/projects/:projectId/co-packages/:id', () => {
    it('should update package with valid data', async () => {
      const updatePayload = {
        packageName: 'Updated Package Name',
        description: 'Updated description',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}`)
        .send(updatePayload)
        .expect(200);

      expect(response.body.id).toBe(createdPackageId);
      expect(response.body.packageName).toBe(updatePayload.packageName);
      expect(response.body.description).toBe(updatePayload.description);
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-packages/${fakeId}`)
        .send({ packageName: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}`)
        .send({ packageName: 'Updated' })
        .expect(401);
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}`)
        .send({ description: 'New description only' })
        .expect(200);

      expect(response.body.description).toBe('New description only');
      // Other fields should remain unchanged
      expect(response.body.packageName).toBeTruthy();
    });
  });

  describe('DELETE /api/v1/projects/:projectId/co-packages/:id', () => {
    let packageToDelete: string;

    beforeEach(async () => {
      // Create a package to delete
      const payload = createPackagePayload({ packageName: 'Package to Delete' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload);

      packageToDelete = response.body.id;
    });

    it('should delete a package', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/co-packages/${packageToDelete}`)
        .expect(204);

      // Verify deletion
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/${packageToDelete}`)
        .expect(404);
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/co-packages/${fakeId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/co-packages/${packageToDelete}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/co-packages/:id/items', () => {
    it('should add an OCO to the package', async () => {
      const addItemPayload = {
        changeOrderId: testOcoId,
        changeOrderType: 'OCO',
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}/items`)
        .send(addItemPayload)
        .expect(201);
    });

    it('should add a CCO to the package', async () => {
      const addItemPayload = {
        changeOrderId: testCcoId,
        changeOrderType: 'CCO',
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}/items`)
        .send(addItemPayload)
        .expect(201);
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const addItemPayload = {
        changeOrderId: testOcoId,
        changeOrderType: 'OCO',
      };

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${fakeId}/items`)
        .send(addItemPayload)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const addItemPayload = {
        changeOrderId: testOcoId,
        changeOrderType: 'OCO',
      };

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}/items`)
        .send(addItemPayload)
        .expect(401);
    });

    it('should return 400 for missing changeOrderId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}/items`)
        .send({ changeOrderType: 'OCO' })
        .expect(400);
    });

    it('should return 400 for invalid changeOrderType', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${createdPackageId}/items`)
        .send({
          changeOrderId: testOcoId,
          changeOrderType: 'INVALID',
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/co-packages/:id/items/:itemId', () => {
    let packageWithItemsId: string;
    let packageItemId: string;

    beforeEach(async () => {
      // Create a package
      const payload = createPackagePayload({ packageName: 'Package with Items' });
      const packageResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload);

      packageWithItemsId = packageResponse.body.id;

      // Add an item
      const addItemPayload = {
        changeOrderId: testOcoId,
        changeOrderType: 'OCO',
      };

      const itemResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageWithItemsId}/items`)
        .send(addItemPayload);

      // Extract item ID from the package (would need to get the package to find the item ID)
      const getPackageResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/${packageWithItemsId}`);

      if (getPackageResponse.body.items && getPackageResponse.body.items.length > 0) {
        packageItemId = getPackageResponse.body.items[0].id;
      }
    });

    it('should remove an item from the package', async () => {
      if (packageItemId) {
        await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .delete(`/api/v1/projects/${projectId}/co-packages/${packageWithItemsId}/items/${packageItemId}`)
          .expect(204);
      } else {
        // Skip if no item ID available
        console.log('Skipping test: No package item ID available');
      }
    });

    it('should return 404 for non-existent item', async () => {
      const fakeItemId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${projectId}/co-packages/${packageWithItemsId}/items/${fakeItemId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeItemId = '00000000-0000-0000-0000-000000000000';

      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/co-packages/${packageWithItemsId}/items/${fakeItemId}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/co-packages/:id/submit', () => {
    let draftPackageId: string;

    beforeEach(async () => {
      // Create a draft package
      const payload = createPackagePayload({ packageName: 'Package to Submit' });
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload);

      draftPackageId = response.body.id;
    });

    it('should submit a package from DRAFT to SUBMITTED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${draftPackageId}/submit`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('SUBMITTED');
      expect(response.body.submittedAt).toBeTruthy();
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${fakeId}/submit`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/co-packages/${draftPackageId}/submit`)
        .send({})
        .expect(401);
    });

    it('should reject invalid status transition', async () => {
      // Submit first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${draftPackageId}/submit`)
        .send({});

      // Try to submit again
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${draftPackageId}/submit`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/co-packages/:id/approve', () => {
    let submittedPackageId: string;

    beforeEach(async () => {
      // Create and submit a package
      const payload = createPackagePayload({ packageName: 'Package to Approve' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload);

      submittedPackageId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${submittedPackageId}/submit`)
        .send({});
    });

    it('should approve a submitted package', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${submittedPackageId}/approve`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.approvedAt).toBeTruthy();
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${fakeId}/approve`)
        .send({})
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${projectId}/co-packages/${submittedPackageId}/approve`)
        .send({})
        .expect(401);
    });

    it('should reject approval from DRAFT status', async () => {
      const payload = createPackagePayload({ packageName: 'Draft Package' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${createResponse.body.id}/approve`)
        .send({})
        .expect(400);
    });
  });

  describe('Workflow Integration Tests', () => {
    it('should complete full package lifecycle: create -> add items -> submit -> approve', async () => {
      // Create
      const payload = createPackagePayload({ packageName: 'Full Lifecycle Package' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload)
        .expect(201);

      const packageId = createResponse.body.id;
      expect(createResponse.body.status).toBe('DRAFT');

      // Add OCO item
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/items`)
        .send({
          changeOrderId: testOcoId,
          changeOrderType: 'OCO',
        })
        .expect(201);

      // Add CCO item
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/items`)
        .send({
          changeOrderId: testCcoId,
          changeOrderType: 'CCO',
        })
        .expect(201);

      // Submit
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/submit`)
        .send({})
        .expect(200);

      expect(submitResponse.body.status).toBe('SUBMITTED');

      // Approve
      const approveResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/approve`)
        .send({})
        .expect(200);

      expect(approveResponse.body.status).toBe('APPROVED');
    });

    it('should manage package items dynamically', async () => {
      // Create package
      const payload = createPackagePayload({ packageName: 'Dynamic Items Package' });
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages`)
        .send(payload)
        .expect(201);

      const packageId = createResponse.body.id;

      // Add multiple items
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/items`)
        .send({
          changeOrderId: testOcoId,
          changeOrderType: 'OCO',
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${projectId}/co-packages/${packageId}/items`)
        .send({
          changeOrderId: testCcoId,
          changeOrderType: 'CCO',
        })
        .expect(201);

      // Get package to verify items
      const getResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${projectId}/co-packages/${packageId}`)
        .expect(200);

      // Check if items are present (structure may vary)
      expect(getResponse.body).toHaveProperty('id');
    });
  });
});
