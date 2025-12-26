/**
 * Cost Periods E2E Tests
 *
 * Comprehensive end-to-end tests for cost period endpoints including:
 * - Cost period creation with validation
 * - Period listing with filtering (by project, budget, status, date range)
 * - Period retrieval by ID
 * - Period updates (OPEN only)
 * - Period deletion (OPEN only)
 * - Period summary with aggregated cost data
 * - Period closing workflow (OPEN → CLOSED with snapshot)
 * - Period locking workflow (CLOSED → LOCKED, immutable)
 * - Status transition validations
 * - Overlapping period validation
 * - Authentication and authorization
 */

import * as request from 'supertest';
import {
  testApp,
  TEST_CREDENTIALS,
  authenticatedRequest,
} from './setup';
import { CostPeriodStatus } from '../../src/modules/financials/enums/cost-period-status.enum';

describe('Cost Periods E2E', () => {
  let testProjectId: string;
  let testBudgetId: string;
  let testCostCodeId: string;
  let testCostPeriodId: string;
  let closedCostPeriodId: string;
  let lockedCostPeriodId: string;

  /**
   * Setup test data before running tests
   * Creates: Project → Budget → Cost Code → Cost Period
   */
  beforeAll(async () => {
    const timestamp = Date.now();

    // Create test project
    const projectResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post('/api/projects')
      .send({
        name: `Cost Period Test Project ${timestamp}`,
        description: 'Test project for cost period E2E tests',
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

    // Create test budget
    const budgetResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/budgets`)
      .send({
        name: `Test Budget ${timestamp}`,
        description: 'Test budget for cost period testing',
        budgetType: 'ORIGINAL',
        totalBudget: 1000000,
      })
      .expect(201);

    testBudgetId = budgetResponse.body.id;

    // Create test cost code
    const costCodeResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
      .post(`/api/v1/projects/${testProjectId}/cost-codes`)
      .send({
        code: `CC-${timestamp}`,
        name: 'Test Cost Code',
        description: 'Test cost code for period testing',
        category: 'LABOR',
      })
      .expect(201);

    testCostCodeId = costCodeResponse.body.id;
  });

  describe('POST /api/v1/projects/:projectId/cost-periods', () => {
    it('should create cost period with valid data', async () => {
      const periodData = {
        projectId: testProjectId,
        budgetId: testBudgetId,
        periodName: 'January 2025',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send(periodData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        projectId: testProjectId,
        budgetId: testBudgetId,
        periodName: 'January 2025',
        status: CostPeriodStatus.OPEN,
      });

      expect(response.body.periodStart).toBeDefined();
      expect(response.body.periodEnd).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      testCostPeriodId = response.body.id;
    });

    it('should create period with different date range', async () => {
      const timestamp = Date.now();
      const periodData = {
        projectId: testProjectId,
        budgetId: testBudgetId,
        periodName: `Q1 2025 - ${timestamp}`,
        periodStart: '2025-04-01',
        periodEnd: '2025-06-30',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send(periodData)
        .expect(201);

      expect(response.body.periodName).toBe(periodData.periodName);
      expect(response.body.status).toBe(CostPeriodStatus.OPEN);
    });

    it('should reject creation without authentication', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'Unauthorized Period',
          periodStart: '2025-02-01',
          periodEnd: '2025-02-28',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          // Missing required fields
          projectId: testProjectId,
        })
        .expect(400);
    });

    it('should validate periodName length constraints', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'AB', // Too short (min 3)
          periodStart: '2025-02-01',
          periodEnd: '2025-02-28',
        })
        .expect(400);
    });

    it('should validate periodEnd is after periodStart', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'Invalid Date Range',
          periodStart: '2025-12-31',
          periodEnd: '2025-01-01', // Before start date
        })
        .expect(400);
    });

    it('should validate date format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'Invalid Date Format',
          periodStart: 'invalid-date',
          periodEnd: '2025-01-31',
        })
        .expect(400);
    });

    it('should validate UUID format for projectId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/invalid-uuid/cost-periods`)
        .send({
          projectId: 'invalid-uuid',
          budgetId: testBudgetId,
          periodName: 'Test Period',
          periodStart: '2025-03-01',
          periodEnd: '2025-03-31',
        })
        .expect(400);
    });

    it('should validate UUID format for budgetId', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: 'invalid-uuid',
          periodName: 'Test Period',
          periodStart: '2025-03-01',
          periodEnd: '2025-03-31',
        })
        .expect(400);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${fakeProjectId}/cost-periods`)
        .send({
          projectId: fakeProjectId,
          budgetId: testBudgetId,
          periodName: 'Test Period',
          periodStart: '2025-03-01',
          periodEnd: '2025-03-31',
        })
        .expect(404);
    });

    it('should return 404 for non-existent budget', async () => {
      const fakeBudgetId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: fakeBudgetId,
          periodName: 'Test Period',
          periodStart: '2025-03-01',
          periodEnd: '2025-03-31',
        })
        .expect(404);
    });

    it('should reject overlapping periods for same project', async () => {
      // This period overlaps with "January 2025" (2025-01-01 to 2025-01-31)
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'Overlapping Period',
          periodStart: '2025-01-15', // Overlaps with existing January period
          periodEnd: '2025-02-15',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-periods', () => {
    it('should return all cost periods for project', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify structure
      const period = response.body[0];
      expect(period).toHaveProperty('id');
      expect(period).toHaveProperty('projectId');
      expect(period).toHaveProperty('budgetId');
      expect(period).toHaveProperty('periodName');
      expect(period).toHaveProperty('periodStart');
      expect(period).toHaveProperty('periodEnd');
      expect(period).toHaveProperty('status');
    });

    it('should filter periods by projectId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?projectId=${testProjectId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        expect(period.projectId).toBe(testProjectId);
      });
    });

    it('should filter periods by budgetId', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?budgetId=${testBudgetId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        expect(period.budgetId).toBe(testBudgetId);
      });
    });

    it('should filter periods by status', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?status=${CostPeriodStatus.OPEN}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        expect(period.status).toBe(CostPeriodStatus.OPEN);
      });
    });

    it('should filter periods by date range (fromDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?fromDate=2025-01-01`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        const periodStart = new Date(period.periodStart);
        const filterDate = new Date('2025-01-01');
        expect(periodStart >= filterDate).toBe(true);
      });
    });

    it('should filter periods by date range (toDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?toDate=2025-12-31`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        const periodEnd = new Date(period.periodEnd);
        const filterDate = new Date('2025-12-31');
        expect(periodEnd <= filterDate).toBe(true);
      });
    });

    it('should filter periods by date range (fromDate and toDate)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?fromDate=2025-01-01&toDate=2025-03-31`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?page=1&limit=10`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should support sorting by periodStart (DESC)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?sortBy=periodStart&sortOrder=DESC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 1) {
        const dates = response.body.map((p: any) => new Date(p.periodStart).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i] >= dates[i + 1]).toBe(true);
        }
      }
    });

    it('should support sorting by periodName (ASC)', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?sortBy=periodName&sortOrder=ASC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for project with no periods', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${fakeProjectId}/cost-periods`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-periods`)
        .expect(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-periods/:id', () => {
    it('should return cost period by ID', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCostPeriodId,
        projectId: testProjectId,
        budgetId: testBudgetId,
        periodName: expect.any(String),
        status: expect.any(String),
      });

      expect(response.body.periodStart).toBeDefined();
      expect(response.body.periodEnd).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should include nested project information', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      if (response.body.project) {
        expect(response.body.project).toHaveProperty('name');
      }
    });

    it('should include nested budget information', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .expect(200);

      expect(response.body).toHaveProperty('budget');
      if (response.body.budget) {
        expect(response.body.budget).toHaveProperty('name');
      }
    });

    it('should return 404 for non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/invalid-uuid`)
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:projectId/cost-periods/:id', () => {
    it('should update OPEN cost period', async () => {
      const updates = {
        periodName: 'January 2025 - Updated',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      };

      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCostPeriodId,
        periodName: updates.periodName,
      });

      expect(response.body.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .send({ periodName: 'January 2025 - Final' })
        .expect(200);

      expect(response.body.periodName).toBe('January 2025 - Final');
    });

    it('should validate periodEnd is after periodStart on update', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .send({
          periodStart: '2025-12-31',
          periodEnd: '2025-01-01', // Before start
        })
        .expect(400);
    });

    it('should validate periodName length on update', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .send({ periodName: 'AB' }) // Too short
        .expect(400);
    });

    it('should return 404 for non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}`)
        .send({ periodName: 'Updated' })
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .send({ periodName: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/cost-periods/:id/summary', () => {
    it('should return cost period summary', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}/summary`)
        .expect(200);

      expect(response.body).toMatchObject({
        periodId: testCostPeriodId,
        periodName: expect.any(String),
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
        status: expect.any(String),
        totalCostEntries: expect.any(Number),
        totalAmount: expect.any(Number),
      });

      expect(response.body).toHaveProperty('entryCountByType');
      expect(response.body).toHaveProperty('entryCountByStatus');
    });

    it('should return zero counts for period with no cost entries', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}/summary`)
        .expect(200);

      expect(response.body.totalCostEntries).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });

    it('should return 404 for non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}/summary`)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}/summary`)
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-periods/:id/close', () => {
    beforeAll(async () => {
      // Create a period specifically for closing tests
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `February 2025 - ${timestamp}`,
          periodStart: '2025-02-01',
          periodEnd: '2025-02-28',
        })
        .expect(201);

      closedCostPeriodId = response.body.id;
    });

    it('should close OPEN cost period', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}/close`)
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        id: closedCostPeriodId,
        status: CostPeriodStatus.CLOSED,
      });

      expect(response.body.closedAt).toBeDefined();
      expect(response.body.closedById).toBeDefined();
      expect(response.body.snapshotData).toBeDefined();
    });

    it('should create immutable snapshot on close', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}`)
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.CLOSED);
      expect(response.body.snapshotData).toBeDefined();
      expect(typeof response.body.snapshotData).toBe('object');
    });

    it('should reject closing already CLOSED period', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}/close`)
        .send({})
        .expect(400);
    });

    it('should reject closing non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}/close`)
        .send({})
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}/close`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/cost-periods/:id/lock', () => {
    beforeAll(async () => {
      // Create and close a period specifically for locking tests
      const timestamp = Date.now();
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `March 2025 - ${timestamp}`,
          periodStart: '2025-03-01',
          periodEnd: '2025-03-31',
        })
        .expect(201);

      lockedCostPeriodId = createResponse.body.id;

      // Close the period first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}/close`)
        .send({})
        .expect(200);
    });

    it('should lock CLOSED cost period', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}/lock`)
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        id: lockedCostPeriodId,
        status: CostPeriodStatus.LOCKED,
      });

      expect(response.body.lockedAt).toBeDefined();
      expect(response.body.lockedById).toBeDefined();
    });

    it('should make period immutable after locking', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}`)
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.LOCKED);
    });

    it('should reject locking already LOCKED period', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}/lock`)
        .send({})
        .expect(400);
    });

    it('should reject locking OPEN period (must be closed first)', async () => {
      // Create a new OPEN period
      const timestamp = Date.now();
      const createResponse = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `April 2025 - ${timestamp}`,
          periodStart: '2025-04-01',
          periodEnd: '2025-04-30',
        })
        .expect(201);

      const openPeriodId = createResponse.body.id;

      // Try to lock without closing first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${openPeriodId}/lock`)
        .send({})
        .expect(400);
    });

    it('should reject locking non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}/lock`)
        .send({})
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}/lock`)
        .send({})
        .expect(401);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/cost-periods/:id', () => {
    let deletablePeriodId: string;

    beforeEach(async () => {
      // Create a fresh OPEN period for each delete test
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `Deletable Period ${timestamp}`,
          periodStart: '2025-05-01',
          periodEnd: '2025-05-31',
        })
        .expect(201);

      deletablePeriodId = response.body.id;
    });

    it('should delete OPEN cost period', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}`)
        .expect(204);

      // Verify period is deleted
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}`)
        .expect(404);
    });

    it('should reject deleting CLOSED period', async () => {
      // Close the period first
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}/close`)
        .send({})
        .expect(200);

      // Try to delete closed period
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}`)
        .expect(400);
    });

    it('should reject deleting LOCKED period', async () => {
      // Close then lock the period
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}/close`)
        .send({})
        .expect(200);

      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}/lock`)
        .send({})
        .expect(200);

      // Try to delete locked period
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}`)
        .expect(400);
    });

    it('should return 404 for non-existent period', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .delete(`/api/v1/projects/${testProjectId}/cost-periods/${fakeId}`)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(testApp.getHttpServer())
        .delete(`/api/v1/projects/${testProjectId}/cost-periods/${deletablePeriodId}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:projectId/cost-periods/:id - CLOSED/LOCKED restrictions', () => {
    it('should reject updating CLOSED period', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}`)
        .send({ periodName: 'Cannot Update Closed' })
        .expect(400);
    });

    it('should reject updating LOCKED period', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .put(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}`)
        .send({ periodName: 'Cannot Update Locked' })
        .expect(400);
    });
  });

  describe('Status Transition Validation', () => {
    let transitionTestPeriodId: string;

    beforeAll(async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `Transition Test ${timestamp}`,
          periodStart: '2025-06-01',
          periodEnd: '2025-06-30',
        })
        .expect(201);

      transitionTestPeriodId = response.body.id;
    });

    it('should transition from OPEN to CLOSED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${transitionTestPeriodId}/close`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.CLOSED);
    });

    it('should transition from CLOSED to LOCKED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods/${transitionTestPeriodId}/lock`)
        .send({})
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.LOCKED);
    });

    it('should maintain immutability after LOCKED', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${transitionTestPeriodId}`)
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.LOCKED);
      expect(response.body.snapshotData).toBeDefined();
      expect(response.body.closedAt).toBeDefined();
      expect(response.body.lockedAt).toBeDefined();
    });
  });

  describe('Workflow Tracking Fields', () => {
    it('should track createdBy and updatedBy', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${testCostPeriodId}`)
        .expect(200);

      expect(response.body.createdById).toBeDefined();
      expect(response.body.updatedById).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should track closedBy after closing', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${closedCostPeriodId}`)
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.CLOSED);
      expect(response.body.closedById).toBeDefined();
      expect(response.body.closedAt).toBeDefined();
    });

    it('should track lockedBy after locking', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods/${lockedCostPeriodId}`)
        .expect(200);

      expect(response.body.status).toBe(CostPeriodStatus.LOCKED);
      expect(response.body.lockedById).toBeDefined();
      expect(response.body.lockedAt).toBeDefined();
    });
  });

  describe('Complex Filtering Scenarios', () => {
    it('should filter by multiple criteria', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?projectId=${testProjectId}&status=${CostPeriodStatus.OPEN}&sortBy=periodStart&sortOrder=DESC`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((period: any) => {
        expect(period.projectId).toBe(testProjectId);
        expect(period.status).toBe(CostPeriodStatus.OPEN);
      });
    });

    it('should handle pagination with filters', async () => {
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .get(`/api/v1/projects/${testProjectId}/cost-periods?projectId=${testProjectId}&page=1&limit=5`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle same-day period (start equals end)', async () => {
      const timestamp = Date.now();
      const response = await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: `Single Day ${timestamp}`,
          periodStart: '2025-07-01',
          periodEnd: '2025-07-01',
        })
        .expect(400); // Should reject because end must be AFTER start
    });

    it('should validate maximum periodName length', async () => {
      const longName = 'A'.repeat(101); // Exceeds max 100
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: longName,
          periodStart: '2025-08-01',
          periodEnd: '2025-08-31',
        })
        .expect(400);
    });

    it('should handle invalid date strings gracefully', async () => {
      await authenticatedRequest(TEST_CREDENTIALS.johnDoe.email)
        .post(`/api/v1/projects/${testProjectId}/cost-periods`)
        .send({
          projectId: testProjectId,
          budgetId: testBudgetId,
          periodName: 'Invalid Dates',
          periodStart: '2025-13-45', // Invalid month/day
          periodEnd: '2025-14-50',
        })
        .expect(400);
    });
  });
});
