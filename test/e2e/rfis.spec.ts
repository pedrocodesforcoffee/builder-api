import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '@src/app.module';
import { RfiStatus, RfiPriority, RfiDiscipline } from '@src/modules/rfis/entities/rfi.entity';

describe('RFI Integration Tests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let projectId: string;
  let userId: string;
  let organizationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup: Get existing test data
    const userResult = await dataSource.query(
      `SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1`,
    );
    userId = userResult[0]?.id;

    const orgResult = await dataSource.query(
      `SELECT id FROM organizations LIMIT 1`,
    );
    organizationId = orgResult[0]?.id;

    const projectResult = await dataSource.query(
      `SELECT id FROM projects WHERE "organizationId" = $1 LIMIT 1`,
      [organizationId],
    );
    projectId = projectResult[0]?.id;

    // Use the test token from earlier testing
    authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZjhiZWJmYS0wNmM1LTQ2OGItYjY3Ni02YTMwNzIwOTQ3MzkiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6InN5c3RlbV9hZG1pbiIsImp0aSI6ImZmNjQ2Yjg5OGEwOWQzYzg3ZmIxY2JlNmIzMTg4NTFhIiwib3JnYW5pemF0aW9ucyI6W3siaWQiOiIwYWFmZjNmYy0wNzY5LTQ3NmYtYTAzMS0yMjNiNGM1N2RjZjUiLCJyb2xlIjoib3duZXIifV0sInByb2plY3RzIjpbeyJyb2xlIjoicHJvamVjdF9hZG1pbiJ9LHsicm9sZSI6InByb2plY3RfbWFuYWdlciJ9LHsicm9sZSI6InByb2plY3RfYWRtaW4ifV0sImlhdCI6MTc2NTY4OTI1MH0.7QkVcPSNTkNCTb-NaFCUluvVzqY8NkOEqIriXYp0M-8';
  });

  afterAll(async () => {
    // Cleanup: Delete test RFIs
    await dataSource.query(
      `DELETE FROM rfi_history WHERE "rfiId" IN (SELECT id FROM rfis WHERE "projectId" = $1)`,
      [projectId],
    );
    await dataSource.query(
      `DELETE FROM rfi_responses WHERE "rfiId" IN (SELECT id FROM rfis WHERE "projectId" = $1)`,
      [projectId],
    );
    await dataSource.query(
      `DELETE FROM rfi_references WHERE "rfiId" IN (SELECT id FROM rfis WHERE "projectId" = $1)`,
      [projectId],
    );
    await dataSource.query(
      `DELETE FROM rfis WHERE "projectId" = $1 AND subject LIKE 'Test%'`,
      [projectId],
    );

    await app.close();
  });

  describe('POST /api/v1/projects/:projectId/rfis', () => {
    it('should create a new RFI in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI - Foundation Depth',
          question: 'Drawing A-101 shows 4ft depth but spec says 5ft. Please clarify which is correct.',
          priority: RfiPriority.HIGH,
          discipline: RfiDiscipline.STRUCTURAL,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.number).toMatch(/RFI-\d{4}/);
      expect(response.body.status).toBe(RfiStatus.DRAFT);
      expect(response.body.subject).toBe('Test RFI - Foundation Depth');
      expect(response.body.priority).toBe(RfiPriority.HIGH);
      expect(response.body.discipline).toBe(RfiDiscipline.STRUCTURAL);
      expect(response.body.ballInCourt).toBe('CREATOR');
      expect(response.body.history).toHaveLength(1);
      expect(response.body.history[0].action).toBe('CREATED');
    });

    it('should create RFI in OPEN status when sendImmediately is true', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI - Immediate Send',
          question: 'This RFI should be sent immediately.',
          assignedToId: userId,
          sendImmediately: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(RfiStatus.OPEN);
      expect(response.body.sentDate).toBeDefined();
      expect(response.body.ballInCourt).toBe('ASSIGNEE');
      expect(response.body.history.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test',
          // Missing question field
        });

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .send({
          subject: 'Test RFI',
          question: 'Test question',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/rfis', () => {
    let testRfiId: string;

    beforeAll(async () => {
      // Create a test RFI for GET tests
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for GET',
          question: 'This is a test RFI for list and detail endpoints',
        });
      testRfiId = response.body.id;
    });

    it('should return list of RFIs', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis?status=DRAFT`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((rfi: any) => rfi.status === 'DRAFT')).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis?priority=HIGH`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data.every((rfi: any) => rfi.priority === 'HIGH')).toBe(true);
      }
    });

    it('should search by subject and question', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis?search=Foundation`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis?page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
    });
  });

  describe('GET /api/v1/projects/:projectId/rfis/:id', () => {
    let testRfiId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for Detail',
          question: 'Test question for detail endpoint',
        });
      testRfiId = response.body.id;
    });

    it('should return RFI with all relations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/${testRfiId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testRfiId);
      expect(response.body.project).toBeDefined();
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.responses).toBeInstanceOf(Array);
      expect(response.body.history).toBeInstanceOf(Array);
      expect(response.body.references).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent RFI', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('RFI Lifecycle: DRAFT → OPEN → ANSWERED → CLOSED', () => {
    let lifecycleRfiId: string;

    it('should complete full RFI lifecycle', async () => {
      // Step 1: Create RFI as DRAFT
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI Lifecycle',
          question: 'This RFI will go through the complete lifecycle.',
          assignedToId: userId,
          priority: RfiPriority.MEDIUM,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.status).toBe(RfiStatus.DRAFT);
      lifecycleRfiId = createResponse.body.id;

      // Step 2: Open the RFI (DRAFT → OPEN)
      const openResponse = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${lifecycleRfiId}/open`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(openResponse.status).toBe(201);
      expect(openResponse.body.status).toBe(RfiStatus.OPEN);
      expect(openResponse.body.sentDate).toBeDefined();
      expect(openResponse.body.ballInCourt).toBe('ASSIGNEE');

      // Step 3: Add official response (OPEN → ANSWERED)
      const responseRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${lifecycleRfiId}/responses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          response: 'The correct depth is 5ft as per specifications Section 03-30-00.',
          isOfficial: true,
        });

      expect(responseRes.status).toBe(201);
      expect(responseRes.body.response).toContain('5ft');
      expect(responseRes.body.isOfficial).toBe(true);

      // Verify status changed to ANSWERED
      const afterResponseRfi = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/${lifecycleRfiId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(afterResponseRfi.body.status).toBe(RfiStatus.ANSWERED);
      expect(afterResponseRfi.body.ballInCourt).toBe('CREATOR');
      expect(afterResponseRfi.body.responseDate).toBeDefined();
      expect(afterResponseRfi.body.officialResponse).toBeDefined();

      // Step 4: Close the RFI (ANSWERED → CLOSED)
      const closeResponse = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${lifecycleRfiId}/close`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(closeResponse.status).toBe(201);
      expect(closeResponse.body.status).toBe(RfiStatus.CLOSED);
      expect(closeResponse.body.closedDate).toBeDefined();

      // Verify complete history
      const finalRfi = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/${lifecycleRfiId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalRfi.body.history.length).toBeGreaterThanOrEqual(4);
      const actions = finalRfi.body.history.map((h: any) => h.action);
      expect(actions).toContain('CREATED');
      expect(actions).toContain('OPENED');
      expect(actions).toContain('ANSWERED');
      expect(actions).toContain('CLOSED');
    });
  });

  describe('PUT /api/v1/projects/:projectId/rfis/:id', () => {
    let updateRfiId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for Update',
          question: 'Original question',
        });
      updateRfiId = response.body.id;
    });

    it('should update RFI fields', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/rfis/${updateRfiId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Updated Subject',
          priority: RfiPriority.HIGH,
        });

      expect(response.status).toBe(200);
      expect(response.body.subject).toBe('Updated Subject');
      expect(response.body.priority).toBe(RfiPriority.HIGH);
    });

    it('should not update closed RFI', async () => {
      // First close an RFI
      const createResp = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'RFI to close',
          question: 'Question',
          assignedToId: userId,
          sendImmediately: true,
        });

      const rfiId = createResp.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${rfiId}/responses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ response: 'Answer', isOfficial: true });

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${rfiId}/close`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to update
      const response = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/rfis/${rfiId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'Should fail' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/projects/:projectId/rfis/:id/void', () => {
    let voidRfiId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for Void',
          question: 'This will be voided',
        });
      voidRfiId = response.body.id;
    });

    it('should void RFI with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${voidRfiId}/void`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Created in error - duplicate of RFI-0001' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(RfiStatus.VOID);
      expect(response.body.voidReason).toBe('Created in error - duplicate of RFI-0001');
    });
  });

  describe('POST /api/v1/projects/:projectId/rfis/:id/references', () => {
    let refRfiId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for References',
          question: 'Question with references',
        });
      refRfiId = response.body.id;
    });

    it('should add reference to RFI', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${refRfiId}/references`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referenceType: 'DRAWING',
          referenceId: '00000000-0000-0000-0000-000000000001',
          referenceNumber: 'A-101',
          referenceTitle: 'Foundation Plan',
          referenceLocation: 'Detail 3/A-101',
        });

      expect(response.status).toBe(201);
      expect(response.body.referenceType).toBe('DRAWING');
      expect(response.body.referenceNumber).toBe('A-101');
    });
  });

  describe('DELETE /api/v1/projects/:projectId/rfis/:id/references/:referenceId', () => {
    let refRfiId: string;
    let referenceId: string;

    beforeAll(async () => {
      const rfiResp = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for Reference Removal',
          question: 'Question',
        });
      refRfiId = rfiResp.body.id;

      const refResp = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${refRfiId}/references`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referenceType: 'DOCUMENT',
          referenceId: '00000000-0000-0000-0000-000000000002',
          referenceNumber: 'DOC-001',
        });
      referenceId = refResp.body.id;
    });

    it('should remove reference from RFI', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/rfis/${refRfiId}/references/${referenceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify reference removed
      const rfiResp = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/${refRfiId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(rfiResp.body.references.length).toBe(0);
    });
  });

  describe('Response Threading', () => {
    let threadRfiId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test RFI for Threading',
          question: 'Original question',
          assignedToId: userId,
          sendImmediately: true,
        });
      threadRfiId = response.body.id;
    });

    it('should support multiple responses', async () => {
      // Add first response (comment)
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${threadRfiId}/responses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          response: 'Need more information',
          responseType: 'CLARIFICATION',
        });

      // Add second response (official)
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/rfis/${threadRfiId}/responses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          response: 'Official answer',
          isOfficial: true,
        });

      // Verify thread
      const rfiResp = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/rfis/${threadRfiId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(rfiResp.body.responses.length).toBe(2);
      expect(rfiResp.body.status).toBe(RfiStatus.ANSWERED);
    });
  });
});
