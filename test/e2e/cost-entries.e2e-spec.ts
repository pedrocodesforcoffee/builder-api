/**
 * Cost Entries E2E Tests
 *
 * Tests all cost entry-related endpoints including:
 * - Cost entry creation (with validation)
 * - Cost entry listing and filtering (by project, budget, cost code, type, status, date range)
 * - Cost entry details retrieval
 * - Cost entry updates (DRAFT only)
 * - Cost entry deletion (DRAFT only)
 * - Cost entry posting (DRAFT -> POSTED with budget impact)
 * - Cost entry voiding (POSTED -> VOID with budget reversal)
 * - Workflow state validations and transitions
 * - Authentication and authorization checks
 * - Budget actualCost integration verification
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';
import { CostEntryStatus } from '../../src/modules/financials/enums/cost-entry-status.enum';
import { CostEntryType } from '../../src/modules/financials/enums/cost-entry-type.enum';

describe('Cost Entries E2E', () => {
  let testProjectId: string;
  let testBudgetId: string;
  let testCostCodeId: string;
  let testCostEntryId: string;

  // Setup: Create test project, budget, and cost code before all tests
  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create test project
    const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/projects')
      .send({
        name: `Cost Entry Test Project ${timestamp}`,
        description: 'Test project for cost entry E2E tests',
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '90001',
        startDate: '2025-01-01',
        estimatedEndDate: '2025-12-31',
        status: 'in_progress',
      })
      .expect(201);

    testProjectId = projectResponse.body.id;

    // 2. Create test cost code
    const costCodeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/v1/cost-codes')
      .send({
        code: `TEST-${timestamp}`,
        name: 'Test Cost Code',
        description: 'Cost code for E2E testing',
        division: '03',
        isActive: true,
      })
      .expect(201);

    testCostCodeId = costCodeResponse.body.id;

    // 3. Create test budget with line item
    const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets`)
      .send({
        name: `Test Budget ${timestamp}`,
        description: 'Budget for cost entry testing',
        version: 1,
        isBaseline: true,
      })
      .expect(201);

    testBudgetId = budgetResponse.body.id;

    // 4. Add budget line item for the cost code
    await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/budgets/${testBudgetId}/line-items`)
      .send({
        costCodeId: testCostCodeId,
        budgetedCost: 100000.00,
        quantity: 100,
        unitCost: 1000.00,
      })
      .expect(201);
  });

  describe('POST /api/v1/projects/:projectId/cost-entries', () => {
    it('should create cost entry with all required fields', async () => {
      const costEntryData = {
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        type: CostEntryType.MATERIAL,
        entryDate: '2025-01-15',
        description: 'Test material purchase for concrete',
        totalCost: 5000.50,
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send(costEntryData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        projectId: testProjectId,
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        type: CostEntryType.MATERIAL,
        entryDate: '2025-01-15',
        description: costEntryData.description,
        totalCost: costEntryData.totalCost,
        status: CostEntryStatus.DRAFT,
      });

      testCostEntryId = response.body.id;
    });

    it('should create cost entry with quantity and unit cost', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-01-16',
          description: 'Labor costs for concrete work',
          totalCost: 3000.00,
          quantity: 40,
          unitCost: 75.00,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        quantity: 40,
        unitCost: 75.00,
        totalCost: 3000.00,
      });
    });

    it('should create cost entry with vendor and invoice number', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-01-17',
          description: 'Equipment rental',
          totalCost: 1500.00,
          vendor: 'ABC Equipment Co.',
          invoiceNumber: 'INV-2025-001',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        vendor: 'ABC Equipment Co.',
        invoiceNumber: 'INV-2025-001',
      });
    });

    it('should reject cost entry without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          // Missing costCodeId, type, entryDate, description, totalCost
        })
        .expect(400);
    });

    it('should validate cost entry type enum', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: 'INVALID_TYPE',
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(400);
    });

    it('should validate date format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: 'invalid-date',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(400);
    });

    it('should validate totalCost is non-negative', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: -500.00,
        })
        .expect(400);
    });

    it('should validate UUID format for budgetId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: 'invalid-uuid',
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(400);
    });

    it('should validate UUID format for costCodeId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: 'invalid-uuid',
          type: CostEntryType.MATERIAL,
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(400);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${fakeProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-01-15',
          description: 'Test entry',
          totalCost: 1000.00,
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-entries', () => {
    let additionalEntries: string[] = [];

    beforeAll(async () => {
      // Create additional test entries for filtering
      const entry1 = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-02-01',
          description: 'Labor entry for filtering test',
          totalCost: 2500.00,
        })
        .expect(201);
      additionalEntries.push(entry1.body.id);

      const entry2 = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-02-15',
          description: 'Equipment entry for filtering test',
          totalCost: 1800.00,
          vendor: 'XYZ Rentals',
        })
        .expect(201);
      additionalEntries.push(entry2.body.id);
    });

    it('should return all cost entries for project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify structure
      const entry = response.body[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('projectId');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('totalCost');
    });

    it('should filter cost entries by type', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?type=${CostEntryType.LABOR}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        expect(entry.type).toBe(CostEntryType.LABOR);
      });
    });

    it('should filter cost entries by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?status=${CostEntryStatus.DRAFT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        expect(entry.status).toBe(CostEntryStatus.DRAFT);
      });
    });

    it('should filter cost entries by date range', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?fromDate=2025-02-01&toDate=2025-02-28`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        const entryDate = new Date(entry.entryDate);
        expect(entryDate >= new Date('2025-02-01')).toBe(true);
        expect(entryDate <= new Date('2025-02-28')).toBe(true);
      });
    });

    it('should filter cost entries by budgetId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?budgetId=${testBudgetId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        expect(entry.budgetId).toBe(testBudgetId);
      });
    });

    it('should filter cost entries by costCodeId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?costCodeId=${testCostCodeId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        expect(entry.costCodeId).toBe(testCostCodeId);
      });
    });

    it('should filter cost entries by vendor', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?vendor=XYZ`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((entry: any) => {
        expect(entry.vendor).toContain('XYZ');
      });
    });

    it('should support pagination', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?page=1&limit=2`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should support sorting by totalCost', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?sortBy=totalCost&sortOrder=ASC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify ascending order
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i].totalCost >= response.body[i - 1].totalCost).toBe(true);
      }
    });

    it('should support sorting by entryDate', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries?sortBy=entryDate&sortOrder=DESC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify descending order
      for (let i = 1; i < response.body.length; i++) {
        const date1 = new Date(response.body[i - 1].entryDate);
        const date2 = new Date(response.body[i].entryDate);
        expect(date1 >= date2).toBe(true);
      }
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-entries`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format in projectId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get('/api/v1/projects/invalid-uuid/cost-entries')
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-entries/:id', () => {
    it('should return cost entry details', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries/${testCostEntryId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCostEntryId,
        projectId: testProjectId,
        budgetId: testBudgetId,
        costCodeId: testCostCodeId,
        type: expect.any(String),
        status: expect.any(String),
        totalCost: expect.any(Number),
      });
    });

    it('should include related entities details', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries/${testCostEntryId}`)
        .expect(200);

      // May include budget, costCode, project details depending on implementation
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent cost entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries/invalid-uuid`)
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-entries/${testCostEntryId}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:projectId/cost-entries/:id', () => {
    let draftEntryId: string;

    beforeAll(async () => {
      // Create a draft entry specifically for update tests
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.OTHER_DIRECT,
          entryDate: '2025-03-01',
          description: 'Entry for update testing',
          totalCost: 750.00,
        })
        .expect(201);

      draftEntryId = response.body.id;
    });

    it('should update DRAFT cost entry', async () => {
      const updates = {
        description: 'Updated description for cost entry',
        totalCost: 850.00,
        vendor: 'Updated Vendor Inc.',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${draftEntryId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        id: draftEntryId,
        description: updates.description,
        totalCost: updates.totalCost,
        vendor: updates.vendor,
        status: CostEntryStatus.DRAFT,
      });
    });

    it('should update cost entry with quantity and unit cost', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${draftEntryId}`)
        .send({
          quantity: 25,
          unitCost: 34.00,
          totalCost: 850.00,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        quantity: 25,
        unitCost: 34.00,
      });
    });

    it('should validate totalCost is non-negative on update', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${draftEntryId}`)
        .send({
          totalCost: -100.00,
        })
        .expect(400);
    });

    it('should validate date format on update', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${draftEntryId}`)
        .send({
          entryDate: 'not-a-date',
        })
        .expect(400);
    });

    it('should return 404 for non-existent cost entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${fakeId}`)
        .send({
          description: 'Update non-existent',
        })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${draftEntryId}`)
        .send({
          description: 'Unauthorized update',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/cost-entries/:id', () => {
    let deletableEntryId: string;

    beforeAll(async () => {
      // Create a draft entry specifically for deletion test
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-03-15',
          description: 'Entry for deletion testing',
          totalCost: 500.00,
        })
        .expect(201);

      deletableEntryId = response.body.id;
    });

    it('should delete DRAFT cost entry', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-entries/${deletableEntryId}`)
        .expect(204);

      // Verify entry is deleted
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-entries/${deletableEntryId}`)
        .expect(404);
    });

    it('should return 404 for non-existent cost entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-entries/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-entries/invalid-uuid`)
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${testProjectId}/cost-entries/${testCostEntryId}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-entries/:id/post', () => {
    let postableEntryId: string;
    let budgetBeforePost: any;

    beforeAll(async () => {
      // Create a draft entry for posting test
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.SUBCONTRACT,
          entryDate: '2025-04-01',
          description: 'Entry for posting test',
          totalCost: 10000.00,
        })
        .expect(201);

      postableEntryId = response.body.id;

      // Get budget state before posting
      const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      budgetBeforePost = budgetResponse.body;
    });

    it('should post DRAFT cost entry and update budget actualCost', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${postableEntryId}/post`)
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        id: postableEntryId,
        status: CostEntryStatus.POSTED,
      });

      // Verify postedAt timestamp is set
      expect(response.body.postedAt).toBeDefined();

      // Verify budget actualCost increased
      const budgetAfterPost = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      // actualCost should have increased by the entry's totalCost
      expect(budgetAfterPost.body.actualCost).toBeGreaterThan(budgetBeforePost.actualCost || 0);
    });

    it('should return 400 when posting already POSTED entry', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${postableEntryId}/post`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent cost entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${fakeId}/post`)
        .send({})
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${postableEntryId}/post`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-entries/:id/void', () => {
    let voidableEntryId: string;
    let budgetBeforeVoid: any;

    beforeAll(async () => {
      // Create and post an entry for voiding test
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.INVOICE,
          entryDate: '2025-04-15',
          description: 'Entry for voiding test',
          totalCost: 7500.00,
        })
        .expect(201);

      voidableEntryId = createResponse.body.id;

      // Post the entry
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${voidableEntryId}/post`)
        .send({})
        .expect(200);

      // Get budget state before voiding
      const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      budgetBeforeVoid = budgetResponse.body;
    });

    it('should void POSTED cost entry and reverse budget actualCost', async () => {
      const voidReason = 'Invoice was incorrect and needs to be reissued';

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${voidableEntryId}/void`)
        .send({ voidReason })
        .expect(200);

      expect(response.body).toMatchObject({
        id: voidableEntryId,
        status: CostEntryStatus.VOID,
        voidReason: voidReason,
      });

      // Verify voidedAt timestamp is set
      expect(response.body.voidedAt).toBeDefined();

      // Verify budget actualCost decreased
      const budgetAfterVoid = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      // actualCost should have decreased by the entry's totalCost
      expect(budgetAfterVoid.body.actualCost).toBeLessThan(budgetBeforeVoid.actualCost);
    });

    it('should require voidReason when voiding', async () => {
      // Create and post another entry
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-04-20',
          description: 'Entry for void validation test',
          totalCost: 500.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      // Try to void without reason
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/void`)
        .send({})
        .expect(400);
    });

    it('should validate voidReason minimum length', async () => {
      // Create and post another entry
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-04-22',
          description: 'Entry for void reason validation',
          totalCost: 300.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      // Try to void with short reason (less than 10 characters)
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/void`)
        .send({ voidReason: 'Short' })
        .expect(400);
    });

    it('should return 400 when voiding DRAFT entry', async () => {
      // Create a draft entry
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-04-25',
          description: 'Draft entry for void test',
          totalCost: 200.00,
        })
        .expect(201);

      // Try to void draft entry
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/void`)
        .send({ voidReason: 'Attempting to void draft entry' })
        .expect(400);
    });

    it('should return 400 when voiding already VOID entry', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${voidableEntryId}/void`)
        .send({ voidReason: 'Attempting to void already voided entry' })
        .expect(400);
    });

    it('should return 404 for non-existent cost entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${fakeId}/void`)
        .send({ voidReason: 'Testing with non-existent entry' })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${voidableEntryId}/void`)
        .send({ voidReason: 'Unauthenticated void attempt' })
        .expect(401);
    });
  });

  describe('Cost Entry Status Transitions', () => {
    it('should transition DRAFT -> POSTED', async () => {
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-05-01',
          description: 'Entry for status transition test',
          totalCost: 1200.00,
        })
        .expect(201);

      expect(createResponse.body.status).toBe(CostEntryStatus.DRAFT);

      const postResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      expect(postResponse.body.status).toBe(CostEntryStatus.POSTED);
    });

    it('should transition POSTED -> VOID', async () => {
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-05-05',
          description: 'Entry for POSTED to VOID transition',
          totalCost: 800.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      const voidResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/void`)
        .send({ voidReason: 'Testing status transition from POSTED to VOID' })
        .expect(200);

      expect(voidResponse.body.status).toBe(CostEntryStatus.VOID);
    });

    it('should prevent updating POSTED entry', async () => {
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-05-10',
          description: 'Entry to test POSTED update prevention',
          totalCost: 950.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      // Try to update posted entry
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}`)
        .send({ description: 'Attempting to update posted entry' })
        .expect(400);
    });

    it('should prevent deleting POSTED entry', async () => {
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.OTHER_DIRECT,
          entryDate: '2025-05-12',
          description: 'Entry to test POSTED delete prevention',
          totalCost: 650.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}/post`)
        .send({})
        .expect(200);

      // Try to delete posted entry
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-entries/${createResponse.body.id}`)
        .expect(400);
    });
  });

  describe('Budget Integration', () => {
    it('should verify budget actualCost is updated correctly after multiple posts', async () => {
      // Get initial budget state
      const initialBudget = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      const initialActualCost = initialBudget.body.actualCost || 0;

      // Create and post first entry
      const entry1 = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-06-01',
          description: 'First entry for budget integration test',
          totalCost: 1000.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${entry1.body.id}/post`)
        .send({})
        .expect(200);

      // Create and post second entry
      const entry2 = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-06-02',
          description: 'Second entry for budget integration test',
          totalCost: 1500.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${entry2.body.id}/post`)
        .send({})
        .expect(200);

      // Verify budget actualCost increased by total
      const finalBudget = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      const expectedActualCost = initialActualCost + 1000.00 + 1500.00;
      expect(finalBudget.body.actualCost).toBeCloseTo(expectedActualCost, 2);
    });

    it('should verify budget actualCost rollback after void', async () => {
      // Get budget state
      const beforeBudget = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      const costBefore = beforeBudget.body.actualCost;

      // Create, post, then void an entry
      const entry = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-06-05',
          description: 'Entry for void rollback test',
          totalCost: 2000.00,
        })
        .expect(201);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${entry.body.id}/post`)
        .send({})
        .expect(200);

      const afterPostBudget = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      expect(afterPostBudget.body.actualCost).toBeCloseTo(costBefore + 2000.00, 2);

      // Void the entry
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries/${entry.body.id}/void`)
        .send({ voidReason: 'Testing budget rollback on void' })
        .expect(200);

      // Verify budget actualCost returned to original
      const afterVoidBudget = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      expect(afterVoidBudget.body.actualCost).toBeCloseTo(costBefore, 2);
    });
  });

  describe('Cost Entry Types', () => {
    it('should create LABOR cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.LABOR,
          entryDate: '2025-07-01',
          description: 'Labor cost for concrete crew',
          totalCost: 3000.00,
          quantity: 40,
          unitCost: 75.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.LABOR);
    });

    it('should create MATERIAL cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.MATERIAL,
          entryDate: '2025-07-02',
          description: 'Concrete materials',
          totalCost: 5000.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.MATERIAL);
    });

    it('should create EQUIPMENT cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.EQUIPMENT,
          entryDate: '2025-07-03',
          description: 'Crane rental',
          totalCost: 2500.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.EQUIPMENT);
    });

    it('should create SUBCONTRACT cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.SUBCONTRACT,
          entryDate: '2025-07-04',
          description: 'Electrical subcontractor invoice',
          totalCost: 15000.00,
          vendor: 'ABC Electrical',
          invoiceNumber: 'ELEC-2025-001',
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.SUBCONTRACT);
    });

    it('should create OTHER_DIRECT cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.OTHER_DIRECT,
          entryDate: '2025-07-05',
          description: 'Building permit fees',
          totalCost: 1200.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.OTHER_DIRECT);
    });

    it('should create OVERHEAD cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.OVERHEAD,
          entryDate: '2025-07-06',
          description: 'Allocated overhead costs',
          totalCost: 800.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.OVERHEAD);
    });

    it('should create INVOICE cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.INVOICE,
          entryDate: '2025-07-07',
          description: 'Vendor invoice for supplies',
          totalCost: 3500.00,
          vendor: 'Supply Co.',
          invoiceNumber: 'INV-2025-100',
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.INVOICE);
    });

    it('should create ACCRUAL cost entry', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-entries`)
        .send({
          budgetId: testBudgetId,
          costCodeId: testCostCodeId,
          type: CostEntryType.ACCRUAL,
          entryDate: '2025-07-08',
          description: 'Accrued unbilled costs',
          totalCost: 4500.00,
        })
        .expect(201);

      expect(response.body.type).toBe(CostEntryType.ACCRUAL);
    });
  });
});
