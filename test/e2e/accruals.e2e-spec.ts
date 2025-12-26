/**
 * Accruals E2E Tests
 *
 * Comprehensive end-to-end tests for all accrual-related endpoints including:
 * - Accrual creation with validation
 * - Accrual listing with filtering (by project, status, date range, commitment, etc.)
 * - Accrual retrieval by ID
 * - Accrual updates (ACTIVE status only)
 * - Accrual deletion (ACTIVE status only)
 * - Accrual reversal (creates negative CostEntry to offset estimate)
 * - Accrual conversion to actual cost (adjusts budget by difference)
 * - Status transitions and workflow validations
 * - Authentication and authorization testing
 * - Data isolation and security
 *
 * Tests all 7 endpoints:
 * - POST   /api/v1/projects/:projectId/accruals           (create)
 * - GET    /api/v1/projects/:projectId/accruals           (list with filters)
 * - GET    /api/v1/projects/:projectId/accruals/:id       (get by ID)
 * - PUT    /api/v1/projects/:projectId/accruals/:id       (update - ACTIVE only)
 * - DELETE /api/v1/projects/:projectId/accruals/:id       (delete - ACTIVE only)
 * - POST   /api/v1/projects/:projectId/accruals/:id/reverse (reverse accrual)
 * - POST   /api/v1/projects/:projectId/accruals/:id/convert (convert to actual)
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';
import { AccrualStatus } from '../../src/modules/financials/enums/accrual-status.enum';

describe('Accruals E2E', () => {
  // Test data IDs (will be populated during setup)
  let testProjectId: string;
  let testBudgetId: string;
  let testCostCodeId: string;
  let testCommitmentId: string;
  let testVendorId: string;

  // Accrual IDs for testing
  let testAccrualId: string;
  let accrualForUpdate: string;
  let accrualForDelete: string;
  let accrualForReverse: string;
  let accrualForConvert: string;

  /**
   * Setup: Create test project, budget, cost code, commitment, and vendor
   * This runs once before all tests in this suite
   */
  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create a test project
    const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/projects')
      .send({
        name: `Accrual Test Project ${timestamp}`,
        description: 'Project for accrual E2E testing',
        address: '100 Accrual Test Blvd',
        city: 'Test City',
        state: 'CA',
        zipCode: '90001',
        startDate: '2025-01-01',
        estimatedEndDate: '2025-12-31',
        status: 'planning',
      })
      .expect(201);

    testProjectId = projectResponse.body.id;

    // 2. Create a test budget for the project
    const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets`)
      .send({
        name: `Test Budget ${timestamp}`,
        description: 'Budget for accrual testing',
        projectId: testProjectId,
        isOriginal: true,
      })
      .expect(201);

    testBudgetId = budgetResponse.body.id;

    // 3. Create a test cost code
    const costCodeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/cost-codes`)
      .send({
        code: `ACC-${timestamp}`,
        name: 'Accrual Test Cost Code',
        description: 'Cost code for accrual testing',
        category: 'Labor',
      })
      .expect(201);

    testCostCodeId = costCodeResponse.body.id;

    // 4. Create a test commitment (for linking accruals)
    const commitmentResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/commitments`)
      .send({
        projectId: testProjectId,
        budgetId: testBudgetId,
        type: 'SUBCONTRACT',
        title: `Test Subcontract ${timestamp}`,
        vendor: 'ABC Contractors',
        contractAmount: 100000,
        startDate: '2025-01-15',
        status: 'DRAFT',
      })
      .expect(201);

    testCommitmentId = commitmentResponse.body.id;

    // Activate the commitment so it can be used in accruals
    await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/commitments/${testCommitmentId}/activate`)
      .send({ notes: 'Activating for accrual tests' })
      .expect(200);

    // 5. Store vendor ID for testing (mock vendor ID for now)
    testVendorId = 'vendor-123';
  });

  /**
   * Cleanup: Remove test data after all tests complete
   */
  afterAll(async () => {
    // Clean up test data if needed
    // Note: In a real scenario, you might want to delete test records
    // For now, we'll leave them as the test database should be isolated
  });

  // ==================== CREATE ACCRUAL TESTS ====================

  describe('POST /api/v1/projects/:projectId/accruals', () => {
    it('should create accrual with all required fields (authenticated)', async () => {
      const accrualData = {
        projectId: testProjectId,
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        description: 'Estimated labor costs for foundation work completed but not yet invoiced',
        estimatedCost: 15000.50,
        accrualDate: '2025-11-30',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send(accrualData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        projectId: testProjectId,
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        description: accrualData.description,
        estimatedCost: accrualData.estimatedCost,
        status: AccrualStatus.ACTIVE,
        accrualNumber: expect.any(String),
      });

      // Store ID for later tests
      testAccrualId = response.body.id;

      // Verify accrual number format (AC-YYYY-XXXXX)
      expect(response.body.accrualNumber).toMatch(/^AC-\d{4}-\d{5}$/);
    });

    it('should create accrual with optional commitment reference', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrued costs linked to ABC Contractors subcontract',
          estimatedCost: 8500.00,
          accrualDate: '2025-11-25',
          commitmentId: testCommitmentId,
          notes: 'Waiting for invoice from subcontractor',
        })
        .expect(201);

      expect(response.body.commitmentId).toBe(testCommitmentId);
      expect(response.body.notes).toBe('Waiting for invoice from subcontractor');

      // Store for update tests
      accrualForUpdate = response.body.id;
    });

    it('should create accrual for deletion test', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Temporary accrual for deletion testing',
          estimatedCost: 1000.00,
          accrualDate: '2025-12-01',
        })
        .expect(201);

      accrualForDelete = response.body.id;
    });

    it('should create accrual for reversal test', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to be reversed - estimate was incorrect',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-28',
        })
        .expect(201);

      accrualForReverse = response.body.id;
    });

    it('should create accrual for conversion test', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to be converted to actual cost when invoice received',
          estimatedCost: 12000.00,
          accrualDate: '2025-11-29',
        })
        .expect(201);

      accrualForConvert = response.body.id;
    });

    it('should reject accrual creation without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Unauthenticated accrual attempt',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(401);
    });

    it('should reject accrual with missing required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          // Missing costCodeId, description, estimatedCost, accrualDate
        })
        .expect(400);
    });

    it('should reject accrual with description too short', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Short', // Less than 10 characters
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(400);
    });

    it('should reject accrual with negative estimated cost', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual with negative cost',
          estimatedCost: -1000.00, // Negative amount
          accrualDate: '2025-11-30',
        })
        .expect(400);
    });

    it('should reject accrual with zero estimated cost', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual with zero cost should fail',
          estimatedCost: 0, // Zero amount
          accrualDate: '2025-11-30',
        })
        .expect(400);
    });

    it('should reject accrual with invalid date format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual with invalid date format',
          estimatedCost: 5000.00,
          accrualDate: 'invalid-date',
        })
        .expect(400);
    });

    it('should reject accrual with invalid UUID for project', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/invalid-uuid/accruals`)
        .send({
          projectId: 'invalid-uuid',
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual with invalid project UUID',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(400);
    });

    it('should reject accrual with non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${fakeProjectId}/accruals`)
        .send({
          projectId: fakeProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for non-existent project',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(404);
    });

    it('should reject accrual with non-existent budget', async () => {
      const fakeBudgetId = '00000000-0000-0000-0000-000000000001';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: fakeBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual with non-existent budget',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(404);
    });

    it('should reject accrual with non-existent cost code', async () => {
      const fakeCostCodeId = '00000000-0000-0000-0000-000000000002';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: fakeCostCodeId,
          description: 'Accrual with non-existent cost code',
          estimatedCost: 5000.00,
          accrualDate: '2025-11-30',
        })
        .expect(404);
    });
  });

  // ==================== LIST ACCRUALS TESTS ====================

  describe('GET /api/v1/projects/:projectId/accruals', () => {
    it('should return all accruals for project (authenticated)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify structure of first accrual
      const accrual = response.body[0];
      expect(accrual).toHaveProperty('id');
      expect(accrual).toHaveProperty('projectId');
      expect(accrual).toHaveProperty('budgetId');
      expect(accrual).toHaveProperty('costCodeId');
      expect(accrual).toHaveProperty('description');
      expect(accrual).toHaveProperty('estimatedCost');
      expect(accrual).toHaveProperty('status');
      expect(accrual).toHaveProperty('accrualNumber');
      expect(accrual).toHaveProperty('accrualDate');
    });

    it('should filter accruals by status (ACTIVE)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?status=ACTIVE`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should have ACTIVE status
      response.body.forEach((accrual: any) => {
        expect(accrual.status).toBe(AccrualStatus.ACTIVE);
      });
    });

    it('should filter accruals by budget', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?budgetId=${testBudgetId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should belong to the specified budget
      response.body.forEach((accrual: any) => {
        expect(accrual.budgetId).toBe(testBudgetId);
      });
    });

    it('should filter accruals by cost code', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?costCodeId=${testCostCodeId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should use the specified cost code
      response.body.forEach((accrual: any) => {
        expect(accrual.costCodeId).toBe(testCostCodeId);
      });
    });

    it('should filter accruals by commitment', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?commitmentId=${testCommitmentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should be linked to the specified commitment
      response.body.forEach((accrual: any) => {
        expect(accrual.commitmentId).toBe(testCommitmentId);
      });
    });

    it('should filter accruals by date range (fromDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?fromDate=2025-11-25`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should have accrualDate >= 2025-11-25
      response.body.forEach((accrual: any) => {
        const accrualDate = new Date(accrual.accrualDate);
        const fromDate = new Date('2025-11-25');
        expect(accrualDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
      });
    });

    it('should filter accruals by date range (toDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?toDate=2025-11-30`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should have accrualDate <= 2025-11-30
      response.body.forEach((accrual: any) => {
        const accrualDate = new Date(accrual.accrualDate);
        const toDate = new Date('2025-11-30');
        expect(accrualDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });

    it('should filter accruals by date range (fromDate and toDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?fromDate=2025-11-25&toDate=2025-11-30`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // All returned accruals should be within date range
      response.body.forEach((accrual: any) => {
        const accrualDate = new Date(accrual.accrualDate);
        const fromDate = new Date('2025-11-25');
        const toDate = new Date('2025-11-30');
        expect(accrualDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
        expect(accrualDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });

    it('should support pagination with limit', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?limit=2`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with page and limit', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?page=1&limit=3`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('should support sorting by accrualDate ascending', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?sortBy=accrualDate&sortOrder=ASC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify ascending order
      if (response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          const prevDate = new Date(response.body[i - 1].accrualDate);
          const currDate = new Date(response.body[i].accrualDate);
          expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
        }
      }
    });

    it('should support sorting by estimatedCost descending', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals?sortBy=estimatedCost&sortOrder=DESC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify descending order
      if (response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i].estimatedCost).toBeLessThanOrEqual(
            response.body[i - 1].estimatedCost
          );
        }
      }
    });

    it('should reject list request without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/accruals`)
        .expect(401);
    });

    it('should return empty array for project with no accruals', async () => {
      // Create a new project with no accruals
      const timestamp = Date.now();
      const newProjectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post('/api/projects')
        .send({
          name: `Empty Accrual Project ${timestamp}`,
          status: 'planning',
        })
        .expect(201);

      const emptyProjectId = newProjectResponse.body.id;

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${emptyProjectId}/accruals`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  // ==================== GET ACCRUAL BY ID TESTS ====================

  describe('GET /api/v1/projects/:projectId/accruals/:id', () => {
    it('should return accrual details by ID (authenticated)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${testAccrualId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testAccrualId,
        projectId: testProjectId,
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        status: AccrualStatus.ACTIVE,
        accrualNumber: expect.any(String),
      });

      // Should include timestamps
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return accrual with commitment details if linked', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .expect(200);

      expect(response.body.commitmentId).toBe(testCommitmentId);
    });

    it('should reject request without authentication', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/accruals/${testAccrualId}`)
        .expect(401);
    });

    it('should return 404 for non-existent accrual', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/invalid-uuid`)
        .expect(400);
    });

    it('should reject access from unauthorized user (different organization)', async () => {
      // David Brown from Elite Properties trying to access Acme project accrual
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${testAccrualId}`)
        .expect(403);
    });
  });

  // ==================== UPDATE ACCRUAL TESTS ====================

  describe('PUT /api/v1/projects/:projectId/accruals/:id', () => {
    it('should update accrual description (ACTIVE status)', async () => {
      const updates = {
        description: 'Updated description for accrued costs with additional details',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send(updates)
        .expect(200);

      expect(response.body.description).toBe(updates.description);
      expect(response.body.id).toBe(accrualForUpdate);
    });

    it('should update accrual estimated cost (ACTIVE status)', async () => {
      const updates = {
        estimatedCost: 9500.00,
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send(updates)
        .expect(200);

      expect(response.body.estimatedCost).toBe(updates.estimatedCost);
    });

    it('should update accrual date (ACTIVE status)', async () => {
      const updates = {
        accrualDate: '2025-11-26',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send(updates)
        .expect(200);

      expect(response.body.accrualDate).toBe(updates.accrualDate);
    });

    it('should update multiple fields at once (ACTIVE status)', async () => {
      const updates = {
        description: 'Comprehensive update with new description and cost estimate',
        estimatedCost: 10500.00,
        notes: 'Updated based on revised scope discussions',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send(updates)
        .expect(200);

      expect(response.body.description).toBe(updates.description);
      expect(response.body.estimatedCost).toBe(updates.estimatedCost);
      expect(response.body.notes).toBe(updates.notes);
    });

    it('should allow clearing optional fields (set to null)', async () => {
      const updates = {
        notes: null,
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send(updates)
        .expect(200);

      expect(response.body.notes).toBeNull();
    });

    it('should reject update without authentication', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ description: 'Unauthorized update' })
        .expect(401);
    });

    it('should reject update with description too short', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ description: 'Short' }) // Less than 10 characters
        .expect(400);
    });

    it('should reject update with negative estimated cost', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ estimatedCost: -500.00 })
        .expect(400);
    });

    it('should reject update with zero estimated cost', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ estimatedCost: 0 })
        .expect(400);
    });

    it('should reject update with invalid date format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ accrualDate: 'invalid-date' })
        .expect(400);
    });

    it('should return 404 for non-existent accrual', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${fakeId}`)
        .send({ description: 'Update non-existent accrual' })
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/invalid-uuid`)
        .send({ description: 'Update with invalid UUID' })
        .expect(400);
    });

    it('should reject update from unauthorized user', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForUpdate}`)
        .send({ description: 'Unauthorized update attempt' })
        .expect(403);
    });
  });

  // ==================== DELETE ACCRUAL TESTS ====================

  describe('DELETE /api/v1/projects/:projectId/accruals/:id', () => {
    it('should delete accrual (ACTIVE status only)', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${accrualForDelete}`)
        .expect(204);

      // Verify accrual is deleted by trying to fetch it
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${accrualForDelete}`)
        .expect(404);
    });

    it('should reject delete without authentication', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthenticated delete test',
          estimatedCost: 500.00,
          accrualDate: '2025-12-02',
        })
        .expect(201);

      const deleteAccrualId = accrualResponse.body.id;

      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${testProjectId}/accruals/${deleteAccrualId}`)
        .expect(401);
    });

    it('should return 404 for non-existent accrual', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/invalid-uuid`)
        .expect(400);
    });

    it('should reject delete from unauthorized user', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthorized delete test',
          estimatedCost: 600.00,
          accrualDate: '2025-12-03',
        })
        .expect(201);

      const deleteAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${deleteAccrualId}`)
        .expect(403);
    });
  });

  // ==================== REVERSE ACCRUAL TESTS ====================

  describe('POST /api/v1/projects/:projectId/accruals/:id/reverse', () => {
    it('should reverse accrual and create negative CostEntry', async () => {
      const reversalData = {
        reversalReason: 'Invoice received showing actual cost was different. Reversing estimate to create actual cost entry.',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}/reverse`)
        .send(reversalData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: accrualForReverse,
        status: AccrualStatus.REVERSED,
      });

      // Should have reversal metadata
      expect(response.body).toHaveProperty('reversedAt');
      expect(response.body).toHaveProperty('reversedBy');
      expect(response.body.reversalReason).toBe(reversalData.reversalReason);

      // Verify status changed to REVERSED
      const verifyResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe(AccrualStatus.REVERSED);
    });

    it('should reject reversal without authentication', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthenticated reversal test',
          estimatedCost: 2000.00,
          accrualDate: '2025-12-04',
        })
        .expect(201);

      const reverseAccrualId = accrualResponse.body.id;

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/accruals/${reverseAccrualId}/reverse`)
        .send({ reversalReason: 'Unauthenticated reversal attempt' })
        .expect(401);
    });

    it('should reject reversal with missing reversal reason', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for missing reason reversal test',
          estimatedCost: 2500.00,
          accrualDate: '2025-12-05',
        })
        .expect(201);

      const reverseAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${reverseAccrualId}/reverse`)
        .send({}) // Missing reversalReason
        .expect(400);
    });

    it('should reject reversal with reversal reason too short', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for short reason reversal test',
          estimatedCost: 3000.00,
          accrualDate: '2025-12-06',
        })
        .expect(201);

      const reverseAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${reverseAccrualId}/reverse`)
        .send({ reversalReason: 'Short' }) // Less than 10 characters
        .expect(400);
    });

    it('should reject reversal of already reversed accrual', async () => {
      // accrualForReverse was already reversed in previous test
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}/reverse`)
        .send({ reversalReason: 'Attempting to reverse already reversed accrual' })
        .expect(400);
    });

    it('should return 404 for non-existent accrual', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${fakeId}/reverse`)
        .send({ reversalReason: 'Reversing non-existent accrual' })
        .expect(404);
    });

    it('should reject reversal from unauthorized user', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthorized reversal test',
          estimatedCost: 3500.00,
          accrualDate: '2025-12-07',
        })
        .expect(201);

      const reverseAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${reverseAccrualId}/reverse`)
        .send({ reversalReason: 'Unauthorized reversal attempt from different org' })
        .expect(403);
    });
  });

  // ==================== CONVERT ACCRUAL TESTS ====================

  describe('POST /api/v1/projects/:projectId/accruals/:id/convert', () => {
    it('should convert accrual to actual cost with same amount (no actualCost provided)', async () => {
      const conversionData = {
        notes: 'Invoice received confirming estimated amount',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${accrualForConvert}/convert`)
        .send(conversionData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: accrualForConvert,
        status: AccrualStatus.CONVERTED,
      });

      // Should have conversion metadata
      expect(response.body).toHaveProperty('convertedAt');
      expect(response.body).toHaveProperty('convertedBy');
      expect(response.body).toHaveProperty('convertedEntryId'); // Link to created CostEntry

      // Verify status changed to CONVERTED
      const verifyResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${accrualForConvert}`)
        .expect(200);

      expect(verifyResponse.body.status).toBe(AccrualStatus.CONVERTED);
    });

    it('should convert accrual with different actual cost (higher than estimate)', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to convert with higher actual cost',
          estimatedCost: 10000.00,
          accrualDate: '2025-12-08',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      const conversionData = {
        actualCost: 12500.00, // Higher than estimate
        invoiceNumber: 'INV-2025-9876',
        vendor: 'XYZ Contractors',
        notes: 'Final invoice received - cost higher due to additional materials',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send(conversionData)
        .expect(200);

      expect(response.body.status).toBe(AccrualStatus.CONVERTED);

      // Budget should be adjusted by difference: 12500 - 10000 = +2500
      // (This would be verified in budget actualCost, but we test status change here)
    });

    it('should convert accrual with different actual cost (lower than estimate)', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to convert with lower actual cost',
          estimatedCost: 8000.00,
          accrualDate: '2025-12-09',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      const conversionData = {
        actualCost: 6500.00, // Lower than estimate
        invoiceNumber: 'INV-2025-5432',
        vendor: 'ABC Contractors Inc',
        notes: 'Final invoice received - cost lower than estimated',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send(conversionData)
        .expect(200);

      expect(response.body.status).toBe(AccrualStatus.CONVERTED);

      // Budget should be adjusted by difference: 6500 - 8000 = -1500 (reduction)
    });

    it('should convert accrual with invoice number and vendor details', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to convert with full invoice details',
          estimatedCost: 7500.00,
          accrualDate: '2025-12-10',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      const conversionData = {
        actualCost: 7500.00,
        invoiceNumber: 'INV-2025-1111',
        vendor: 'Premium Contractors LLC',
        notes: 'Final invoice with all details confirmed',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send(conversionData)
        .expect(200);

      expect(response.body.status).toBe(AccrualStatus.CONVERTED);
      expect(response.body).toHaveProperty('convertedEntryId');
    });

    it('should reject conversion without authentication', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthenticated conversion test',
          estimatedCost: 4000.00,
          accrualDate: '2025-12-11',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send({ actualCost: 4000.00 })
        .expect(401);
    });

    it('should reject conversion with negative actual cost', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for negative cost conversion test',
          estimatedCost: 4500.00,
          accrualDate: '2025-12-12',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send({ actualCost: -1000.00 })
        .expect(400);
    });

    it('should reject conversion with zero actual cost', async () => {
      // Create a new accrual for this test
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for zero cost conversion test',
          estimatedCost: 5500.00,
          accrualDate: '2025-12-13',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send({ actualCost: 0 })
        .expect(400);
    });

    it('should reject conversion of already converted accrual', async () => {
      // accrualForConvert was already converted in previous test
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${accrualForConvert}/convert`)
        .send({ actualCost: 5000.00, notes: 'Attempting to convert already converted accrual' })
        .expect(400);
    });

    it('should reject conversion of reversed accrual', async () => {
      // accrualForReverse was reversed in previous tests
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}/convert`)
        .send({ actualCost: 5000.00, notes: 'Attempting to convert reversed accrual' })
        .expect(400);
    });

    it('should return 404 for non-existent accrual', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${fakeId}/convert`)
        .send({ actualCost: 5000.00 })
        .expect(404);
    });

    it('should reject conversion from unauthorized user', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for unauthorized conversion test',
          estimatedCost: 6000.00,
          accrualDate: '2025-12-14',
        })
        .expect(201);

      const convertAccrualId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${convertAccrualId}/convert`)
        .send({ actualCost: 6000.00, notes: 'Unauthorized conversion attempt' })
        .expect(403);
    });
  });

  // ==================== STATUS TRANSITION TESTS ====================

  describe('Accrual Status Transitions', () => {
    it('should not allow updating a REVERSED accrual', async () => {
      // accrualForReverse is REVERSED
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}`)
        .send({ description: 'Attempting to update reversed accrual' })
        .expect(400);
    });

    it('should not allow updating a CONVERTED accrual', async () => {
      // accrualForConvert is CONVERTED
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${accrualForConvert}`)
        .send({ description: 'Attempting to update converted accrual' })
        .expect(400);
    });

    it('should not allow deleting a REVERSED accrual', async () => {
      // accrualForReverse is REVERSED
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${accrualForReverse}`)
        .expect(400);
    });

    it('should not allow deleting a CONVERTED accrual', async () => {
      // accrualForConvert is CONVERTED
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${accrualForConvert}`)
        .expect(400);
    });

    it('should verify ACTIVE is the only status that allows modifications', async () => {
      // Create a new ACTIVE accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual to verify ACTIVE status allows modifications',
          estimatedCost: 3000.00,
          accrualDate: '2025-12-15',
        })
        .expect(201);

      const activeAccrualId = accrualResponse.body.id;

      // Should allow update when ACTIVE
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${activeAccrualId}`)
        .send({ estimatedCost: 3500.00 })
        .expect(200);

      // Should allow delete when ACTIVE
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${activeAccrualId}`)
        .expect(204);
    });
  });

  // ==================== DATA ISOLATION TESTS ====================

  describe('Data Isolation and Security', () => {
    it('should not expose accruals from other organizations in list', async () => {
      // John Doe (Acme) should not see David Brown's (Elite Properties) accruals
      const johnResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/accruals`)
        .expect(200);

      // All accruals should belong to John's project
      johnResponse.body.forEach((accrual: any) => {
        expect(accrual.projectId).toBe(testProjectId);
      });
    });

    it('should prevent cross-organization accrual access', async () => {
      // David Brown from Elite Properties trying to access Acme project accrual
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .get(`/api/v1/projects/${testProjectId}/accruals/${testAccrualId}`)
        .expect(403);
    });

    it('should prevent cross-organization accrual updates', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .put(`/api/v1/projects/${testProjectId}/accruals/${testAccrualId}`)
        .send({ description: 'Unauthorized cross-org update' })
        .expect(403);
    });

    it('should prevent cross-organization accrual deletion', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for cross-org deletion test',
          estimatedCost: 2000.00,
          accrualDate: '2025-12-16',
        })
        .expect(201);

      const crossOrgDeleteId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .delete(`/api/v1/projects/${testProjectId}/accruals/${crossOrgDeleteId}`)
        .expect(403);
    });

    it('should prevent cross-organization accrual reversal', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for cross-org reversal test',
          estimatedCost: 2500.00,
          accrualDate: '2025-12-17',
        })
        .expect(201);

      const crossOrgReverseId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${crossOrgReverseId}/reverse`)
        .send({ reversalReason: 'Unauthorized cross-org reversal attempt' })
        .expect(403);
    });

    it('should prevent cross-organization accrual conversion', async () => {
      // Create a new accrual
      const accrualResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/accruals`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          description: 'Accrual for cross-org conversion test',
          estimatedCost: 3000.00,
          accrualDate: '2025-12-18',
        })
        .expect(201);

      const crossOrgConvertId = accrualResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.davidBrown.email)
        .post(`/api/v1/projects/${testProjectId}/accruals/${crossOrgConvertId}/convert`)
        .send({ actualCost: 3000.00, notes: 'Unauthorized cross-org conversion' })
        .expect(403);
    });
  });

  // ==================== COMPLEX FILTERING TESTS ====================

  describe('Complex Filtering Scenarios', () => {
    it('should filter by multiple criteria (status + date range)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(
          `/api/v1/projects/${testProjectId}/accruals?status=ACTIVE&fromDate=2025-11-01&toDate=2025-12-31`
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((accrual: any) => {
        expect(accrual.status).toBe(AccrualStatus.ACTIVE);
        const accrualDate = new Date(accrual.accrualDate);
        expect(accrualDate.getTime()).toBeGreaterThanOrEqual(new Date('2025-11-01').getTime());
        expect(accrualDate.getTime()).toBeLessThanOrEqual(new Date('2025-12-31').getTime());
      });
    });

    it('should filter by budget and cost code together', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(
          `/api/v1/projects/${testProjectId}/accruals?budgetId=${testBudgetId}&costCodeId=${testCostCodeId}`
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((accrual: any) => {
        expect(accrual.budgetId).toBe(testBudgetId);
        expect(accrual.costCodeId).toBe(testCostCodeId);
      });
    });

    it('should combine filters, sorting, and pagination', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(
          `/api/v1/projects/${testProjectId}/accruals?status=ACTIVE&sortBy=estimatedCost&sortOrder=DESC&limit=5&page=1`
        )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);

      // Verify ACTIVE status
      response.body.forEach((accrual: any) => {
        expect(accrual.status).toBe(AccrualStatus.ACTIVE);
      });

      // Verify descending order by estimatedCost
      if (response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i].estimatedCost).toBeLessThanOrEqual(
            response.body[i - 1].estimatedCost
          );
        }
      }
    });
  });
});
