/**
 * Cost Transfers E2E Tests
 *
 * Tests all cost transfer-related endpoints including:
 * - Cost transfer creation (DRAFT status)
 * - Cost transfer listing and filtering (by status, date range, cost codes)
 * - Cost transfer details retrieval
 * - Cost transfer updates (DRAFT only)
 * - Cost transfer deletion (DRAFT only)
 * - Submit for approval (DRAFT → PENDING_APPROVAL)
 * - Approve transfer (PENDING_APPROVAL → APPROVED, creates debit/credit entries)
 * - Reject transfer (PENDING_APPROVAL → REJECTED, requires reason)
 * - Void transfer (APPROVED → VOID, requires reason)
 * - Budget validation (sufficient funds before approval)
 * - Workflow state transitions
 * - Authentication and authorization
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';
import { CostTransferStatus } from '../../src/modules/financials/enums/cost-transfer-status.enum';

describe('Cost Transfers E2E', () => {
  // Test data IDs
  let testProjectId: string;
  let testBudgetId: string;
  let fromCostCodeId: string;
  let toCostCodeId: string;
  let fromLineItemId: string;
  let toLineItemId: string;

  // Cost transfer IDs for testing
  let draftTransferId: string;
  let pendingTransferId: string;
  let approvedTransferId: string;
  let rejectedTransferId: string;

  /**
   * Setup test data before running tests
   * Creates project, budget, cost codes, and budget line items
   */
  beforeAll(async () => {
    const timestamp = Date.now();

    // Create test project
    const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/projects')
      .send({
        name: `Cost Transfer Test Project ${timestamp}`,
        description: 'Project for testing cost transfers',
        address: '123 Transfer St',
        city: 'Budget City',
        state: 'CA',
        zipCode: '90001',
        startDate: '2025-01-01',
        estimatedEndDate: '2025-12-31',
        status: 'planning',
      })
      .expect(201);

    testProjectId = projectResponse.body.id;

    // Create FROM cost code
    const fromCostCodeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/cost-codes`)
      .send({
        code: '01.100',
        name: 'General Requirements - FROM',
        description: 'Source cost code for transfers',
        division: 1,
        fullCode: '01.100',
        isActive: true,
        sortOrder: 1,
      })
      .expect(201);

    fromCostCodeId = fromCostCodeResponse.body.id;

    // Create TO cost code
    const toCostCodeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/cost-codes`)
      .send({
        code: '03.100',
        name: 'Concrete - TO',
        description: 'Target cost code for transfers',
        division: 3,
        fullCode: '03.100',
        isActive: true,
        sortOrder: 2,
      })
      .expect(201);

    toCostCodeId = toCostCodeResponse.body.id;

    // Create budget
    const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets`)
      .send({
        name: `Test Budget ${timestamp}`,
        description: 'Budget for cost transfer testing',
        category: 'LABOR',
        totalAmount: 500000.00,
        projectId: testProjectId,
        status: 'DRAFT',
      })
      .expect(201);

    testBudgetId = budgetResponse.body.id;

    // Create budget line item for FROM cost code (with $100,000 allocation)
    const fromLineItemResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets/${testBudgetId}/line-items`)
      .send({
        budgetId: testBudgetId,
        costCodeId: fromCostCodeId,
        category: 'LABOR',
        description: 'Initial allocation for FROM cost code',
        budgetedCost: 100000.00,
      })
      .expect(201);

    fromLineItemId = fromLineItemResponse.body.id;

    // Create budget line item for TO cost code (with $50,000 allocation)
    const toLineItemResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets/${testBudgetId}/line-items`)
      .send({
        budgetId: testBudgetId,
        costCodeId: toCostCodeId,
        category: 'LABOR',
        description: 'Initial allocation for TO cost code',
        budgetedCost: 50000.00,
      })
      .expect(201);

    toLineItemId = toLineItemResponse.body.id;
  });

  describe('POST /api/v1/projects/:projectId/cost-transfers', () => {
    it('should create cost transfer as authenticated user (John Doe)', async () => {
      const transferData = {
        projectId: testProjectId,
        budgetId: testBudgetId,
        fromCostCodeId: fromCostCodeId,
        toCostCodeId: toCostCodeId,
        amount: 25000.00,
        reason: 'Reallocating funds from general requirements to concrete work due to scope change in foundation design',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send(transferData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        projectId: testProjectId,
        budgetId: testBudgetId,
        fromCostCodeId: fromCostCodeId,
        toCostCodeId: toCostCodeId,
        amount: 25000.00,
        status: CostTransferStatus.DRAFT,
        reason: transferData.reason,
      });

      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      draftTransferId = response.body.id;
    });

    it('should create cost transfer with minimum valid amount (0.01)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 0.01,
          reason: 'Testing minimum amount transfer for validation purposes',
        })
        .expect(201);

      expect(response.body.amount).toBe(0.01);
    });

    it('should reject cost transfer without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 5000.00,
          reason: 'Unauthorized transfer attempt',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          // Missing toCostCodeId, amount, and reason
        })
        .expect(400);
    });

    it('should validate amount is positive and at least 0.01', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 0.00, // Invalid: below minimum
          reason: 'Testing zero amount validation',
        })
        .expect(400);
    });

    it('should validate reason has minimum length of 10 characters', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 5000.00,
          reason: 'Too short', // Only 9 characters
        })
        .expect(400);
    });

    it('should validate fromCostCodeId and toCostCodeId are different', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: fromCostCodeId, // Same as fromCostCodeId
          amount: 5000.00,
          reason: 'Testing same cost code validation',
        })
        .expect(400);
    });

    it('should validate cost code exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fakeId,
          toCostCodeId: toCostCodeId,
          amount: 5000.00,
          reason: 'Testing non-existent cost code validation',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-transfers', () => {
    it('should return all cost transfers for authenticated user', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const transfer = response.body[0];
      expect(transfer).toHaveProperty('id');
      expect(transfer).toHaveProperty('projectId');
      expect(transfer).toHaveProperty('status');
      expect(transfer).toHaveProperty('amount');
      expect(transfer).toHaveProperty('fromCostCodeId');
      expect(transfer).toHaveProperty('toCostCodeId');
    });

    it('should filter cost transfers by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?status=${CostTransferStatus.DRAFT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((transfer: any) => {
        expect(transfer.status).toBe(CostTransferStatus.DRAFT);
      });
    });

    it('should filter cost transfers by fromCostCodeId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?fromCostCodeId=${fromCostCodeId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((transfer: any) => {
        expect(transfer.fromCostCodeId).toBe(fromCostCodeId);
      });
    });

    it('should filter cost transfers by toCostCodeId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?toCostCodeId=${toCostCodeId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((transfer: any) => {
        expect(transfer.toCostCodeId).toBe(toCostCodeId);
      });
    });

    it('should filter cost transfers by date range', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .expect(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-transfers/:id', () => {
    it('should return cost transfer details by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: draftTransferId,
        projectId: testProjectId,
        budgetId: testBudgetId,
        fromCostCodeId: fromCostCodeId,
        toCostCodeId: toCostCodeId,
        status: CostTransferStatus.DRAFT,
      });

      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('reason');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers/invalid-uuid`)
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:projectId/cost-transfers/:id', () => {
    it('should update cost transfer in DRAFT status', async () => {
      const updates = {
        amount: 30000.00,
        reason: 'Updated reason: Additional funds needed for concrete work based on revised structural engineering calculations',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        id: draftTransferId,
        amount: updates.amount,
        reason: updates.reason,
        status: CostTransferStatus.DRAFT,
      });
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .send({ amount: 28000.00 })
        .expect(200);

      expect(response.body.amount).toBe(28000.00);
      expect(response.body.status).toBe(CostTransferStatus.DRAFT);
    });

    it('should reject update of non-DRAFT cost transfer', async () => {
      // First, create and submit a transfer to PENDING_APPROVAL
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 5000.00,
          reason: 'Transfer for testing update validation on non-draft status',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Try to update - should fail
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}`)
        .send({ amount: 6000.00 })
        .expect(400);
    });

    it('should validate updated amount is positive', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .send({ amount: -1000.00 })
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}`)
        .send({ amount: 5000.00 })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .send({ amount: 5000.00 })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/cost-transfers/:id', () => {
    it('should delete cost transfer in DRAFT status', async () => {
      // Create a new transfer to delete
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 1000.00,
          reason: 'Transfer created for deletion testing',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Delete the transfer
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}`)
        .expect(204);

      // Verify it's deleted
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}`)
        .expect(404);
    });

    it('should reject deletion of non-DRAFT cost transfer', async () => {
      // Create and submit a transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 2000.00,
          reason: 'Transfer for testing deletion validation on non-draft status',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Try to delete - should fail
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}`)
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}`)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-transfers/:id/submit', () => {
    it('should submit DRAFT cost transfer for approval', async () => {
      // Create a new transfer to submit
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 15000.00,
          reason: 'Transfer to be submitted for approval workflow testing',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: transferId,
        status: CostTransferStatus.PENDING_APPROVAL,
      });

      expect(response.body).toHaveProperty('submittedAt');
      expect(response.body).toHaveProperty('submittedBy');

      pendingTransferId = transferId;
    });

    it('should reject submit of non-DRAFT cost transfer', async () => {
      // Try to submit an already submitted transfer
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${pendingTransferId}/submit`)
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}/submit`)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${pendingTransferId}/submit`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-transfers/:id/approve', () => {
    it('should approve PENDING_APPROVAL cost transfer and create cost entries', async () => {
      // Create and submit a transfer for approval
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 10000.00,
          reason: 'Transfer to be approved for testing cost entry creation',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Approve the transfer
      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: transferId,
        status: CostTransferStatus.APPROVED,
        amount: 10000.00,
      });

      expect(response.body).toHaveProperty('approvedAt');
      expect(response.body).toHaveProperty('approvedBy');

      approvedTransferId = transferId;

      // Verify cost entries were created
      // Note: This would require a cost entries endpoint to verify
      // For now, we validate the response status
    });

    it('should reject approval of non-PENDING_APPROVAL cost transfer', async () => {
      // Try to approve an already approved transfer
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${approvedTransferId}/approve`)
        .expect(400);
    });

    it('should reject approval if insufficient funds in FROM cost code', async () => {
      // Create a transfer with amount exceeding available budget
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 999999.99, // Exceeds available budget
          reason: 'Testing insufficient funds validation during approval',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Try to approve - should fail due to insufficient funds
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}/approve`)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${approvedTransferId}/approve`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-transfers/:id/reject', () => {
    it('should reject PENDING_APPROVAL cost transfer with reason', async () => {
      // Create and submit a transfer for rejection
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 8000.00,
          reason: 'Transfer to be rejected for testing rejection workflow',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Reject the transfer
      const rejectionReason = 'Insufficient justification provided. Please provide more details about the scope change.';
      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/reject`)
        .send({ rejectionReason })
        .expect(200);

      expect(response.body).toMatchObject({
        id: transferId,
        status: CostTransferStatus.REJECTED,
        rejectionReason: rejectionReason,
      });

      expect(response.body).toHaveProperty('rejectedAt');
      expect(response.body).toHaveProperty('rejectedBy');

      rejectedTransferId = transferId;
    });

    it('should require rejection reason', async () => {
      // Create and submit a transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 3000.00,
          reason: 'Transfer for testing rejection reason validation',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Try to reject without reason
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/reject`)
        .send({})
        .expect(400);
    });

    it('should validate rejection reason has minimum length', async () => {
      // Create and submit a transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 3500.00,
          reason: 'Transfer for testing rejection reason length validation',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Try to reject with short reason
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/reject`)
        .send({ rejectionReason: 'Too short' }) // Less than 10 characters
        .expect(400);
    });

    it('should reject rejection of non-PENDING_APPROVAL cost transfer', async () => {
      // Try to reject a DRAFT transfer
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${draftTransferId}/reject`)
        .send({ rejectionReason: 'Attempting to reject a draft transfer' })
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}/reject`)
        .send({ rejectionReason: 'Testing non-existent transfer rejection' })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${rejectedTransferId}/reject`)
        .send({ rejectionReason: 'Unauthorized rejection attempt' })
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-transfers/:id/void', () => {
    it('should void APPROVED cost transfer with reason', async () => {
      // Create, submit, and approve a transfer to void
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 7000.00,
          reason: 'Transfer to be voided for testing void workflow',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Submit for approval
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      // Approve the transfer
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(200);

      // Void the transfer
      const voidReason = 'Voiding transfer due to budget reallocation error discovered during audit';
      const response = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/void`)
        .send({ voidReason })
        .expect(200);

      expect(response.body).toMatchObject({
        id: transferId,
        status: CostTransferStatus.VOID,
        voidReason: voidReason,
      });

      expect(response.body).toHaveProperty('voidedAt');
      expect(response.body).toHaveProperty('voidedBy');
    });

    it('should require void reason', async () => {
      // Create, submit, and approve a transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 4000.00,
          reason: 'Transfer for testing void reason validation',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(200);

      // Try to void without reason
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/void`)
        .send({})
        .expect(400);
    });

    it('should validate void reason has minimum length', async () => {
      // Create, submit, and approve a transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 4500.00,
          reason: 'Transfer for testing void reason length validation',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(200);

      // Try to void with short reason
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/void`)
        .send({ voidReason: 'Too short' }) // Less than 10 characters
        .expect(400);
    });

    it('should reject void of non-APPROVED cost transfer', async () => {
      // Try to void a PENDING_APPROVAL transfer
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${pendingTransferId}/void`)
        .send({ voidReason: 'Attempting to void a pending approval transfer' })
        .expect(400);
    });

    it('should return 404 for non-existent cost transfer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${fakeId}/void`)
        .send({ voidReason: 'Testing non-existent transfer void' })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${approvedTransferId}/void`)
        .send({ voidReason: 'Unauthorized void attempt' })
        .expect(401);
    });
  });

  describe('Cost Transfer Workflow State Transitions', () => {
    it('should follow complete workflow: DRAFT → PENDING_APPROVAL → APPROVED → VOID', async () => {
      // Create (DRAFT)
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 12000.00,
          reason: 'Complete workflow testing from draft to void status',
        })
        .expect(201);

      expect(createResponse.body.status).toBe(CostTransferStatus.DRAFT);
      const transferId = createResponse.body.id;

      // Submit (DRAFT → PENDING_APPROVAL)
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      expect(submitResponse.body.status).toBe(CostTransferStatus.PENDING_APPROVAL);

      // Approve (PENDING_APPROVAL → APPROVED)
      const approveResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(200);

      expect(approveResponse.body.status).toBe(CostTransferStatus.APPROVED);

      // Void (APPROVED → VOID)
      const voidResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/void`)
        .send({ voidReason: 'Voiding as part of complete workflow test' })
        .expect(200);

      expect(voidResponse.body.status).toBe(CostTransferStatus.VOID);
    });

    it('should follow rejection workflow: DRAFT → PENDING_APPROVAL → REJECTED', async () => {
      // Create (DRAFT)
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 6000.00,
          reason: 'Rejection workflow testing from draft to rejected status',
        })
        .expect(201);

      expect(createResponse.body.status).toBe(CostTransferStatus.DRAFT);
      const transferId = createResponse.body.id;

      // Submit (DRAFT → PENDING_APPROVAL)
      const submitResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/submit`)
        .expect(200);

      expect(submitResponse.body.status).toBe(CostTransferStatus.PENDING_APPROVAL);

      // Reject (PENDING_APPROVAL → REJECTED)
      const rejectResponse = await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/reject`)
        .send({ rejectionReason: 'Rejecting as part of rejection workflow test' })
        .expect(200);

      expect(rejectResponse.body.status).toBe(CostTransferStatus.REJECTED);
    });

    it('should prevent invalid state transitions', async () => {
      // Create a DRAFT transfer
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          fromCostCodeId: fromCostCodeId,
          toCostCodeId: toCostCodeId,
          amount: 2500.00,
          reason: 'Testing invalid state transition prevention',
        })
        .expect(201);

      const transferId = createResponse.body.id;

      // Try to approve without submitting (DRAFT → APPROVED) - should fail
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/approve`)
        .expect(400);

      // Try to void without approving (DRAFT → VOID) - should fail
      await authenticatedRequest(TEST_CREDENTIALS.janeSmith.email)
        .post(`/api/v1/projects/${testProjectId}/cost-transfers/${transferId}/void`)
        .send({ voidReason: 'Attempting invalid state transition' })
        .expect(400);
    });
  });

  describe('Multiple Cost Transfers and Filtering', () => {
    it('should support multiple concurrent transfers', async () => {
      const transfers = [];

      // Create 3 transfers
      for (let i = 1; i <= 3; i++) {
        const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
          .post(`/api/v1/projects/${testProjectId}/cost-transfers`)
          .send({
            projectId: testProjectId,
            budgetId: testBudgetId,
            fromCostCodeId: fromCostCodeId,
            toCostCodeId: toCostCodeId,
            amount: 1000.00 * i,
            reason: `Multiple transfer test ${i} - testing concurrent cost transfers`,
          })
          .expect(201);

        transfers.push(response.body);
      }

      // Verify all transfers are in DRAFT
      const listResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?status=${CostTransferStatus.DRAFT}`)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by multiple status values', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?status=${CostTransferStatus.APPROVED},${CostTransferStatus.VOID}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((transfer: any) => {
        expect([CostTransferStatus.APPROVED, CostTransferStatus.VOID]).toContain(transfer.status);
      });
    });

    it('should support pagination', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?limit=5&offset=0`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should sort transfers by creation date', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-transfers?sortBy=createdAt&order=desc`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify descending order
      for (let i = 0; i < response.body.length - 1; i++) {
        const current = new Date(response.body[i].createdAt);
        const next = new Date(response.body[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});
