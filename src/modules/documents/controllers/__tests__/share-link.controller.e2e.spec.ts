import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ShareLinkController } from '../share-link.controller';
import { ShareLinkService } from '../../services/share-link.service';
import { PermissionService } from '../../services/permission.service';
import { S3Service } from '../../../../common/services/s3.service';
import { WatermarkService } from '../../services/watermark.service';
import {
  ShareLink,
  Document,
  DocumentVersion,
} from '../../entities';
import { User } from '../../../users/entities/user.entity';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectMember } from '../../../projects/entities/project-member.entity';

describe('ShareLinkController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testProjectId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'builder_test',
          entities: [ShareLink, Document, DocumentVersion, User, Project, ProjectMember],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ShareLink, Document]),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ShareLinkController],
      providers: [
        ShareLinkService,
        PermissionService,
        S3Service,
        WatermarkService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create test data
    // TODO: Set up test user, project, and document
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:projectId/share-links', () => {
    it('should create a share link and return response with id and url fields', async () => {
      const createShareLinkDto = {
        documentIds: [testDocumentId],
        name: 'Test Share Link',
        description: 'Test description',
        settings: {
          expiration: 'never',
          accessLimit: 'unlimited',
          allowDownload: true,
          requirePassword: false,
          requireEmailVerification: false,
          allowPrint: false,
          enableWatermark: false,
          notifyOnAccess: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/projects/${testProjectId}/share-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createShareLinkDto)
        .expect(201);

      // Log the actual response
      console.log('API Response:', JSON.stringify(response.body, null, 2));

      // Assert response has required fields
      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.url).toBeDefined();
      expect(response.body.shortCode).toBeDefined();
      expect(response.body.documentId).toBe(testDocumentId);

      // These assertions would trigger the error if fields are missing
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url).toContain('/s/');
      expect(response.body.url).toContain(response.body.shortCode);
    });

    it('should fail with undefined link.id (reproducing the frontend error)', async () => {
      const createShareLinkDto = {
        documentIds: [testDocumentId],
        name: 'Test Share Link',
        description: 'Test description',
        settings: {
          expiration: 'never',
          accessLimit: 'unlimited',
          allowDownload: true,
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/projects/${testProjectId}/share-links`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createShareLinkDto);

      console.log('[TEST] Checking if link.id exists...');
      console.log('[TEST] Response body:', response.body);

      //  This simulates what the frontend does at ShareLinkDialog.tsx:92
      const link = response.body;

      // This should NOT throw an error
      expect(() => {
        const linkId = link.id;  // This is what fails in the frontend
        console.log('[TEST] link.id =', linkId);
      }).not.toThrow();

      expect(link).toBeDefined();
      expect(link.id).toBeDefined();
    });
  });

  describe('POST /s/:shortCode/download', () => {
    let testShareLink: any;

    beforeEach(async () => {
      // Create a test share link for download tests
      // TODO: Create test share link via service
    });

    it('should successfully download document via share link', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/s/${testShareLink.shortCode}/download`)
        .send({})
        .expect(200);

      expect(response.headers['content-type']).toBeDefined();
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-length']).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should download document with correct filename', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/s/${testShareLink.shortCode}/download`)
        .send({})
        .expect(200);

      expect(response.headers['content-disposition']).toContain('filename');
      expect(response.headers['content-disposition']).toMatch(/\.pdf"|\.docx"|\.xlsx"/);
    });

    it('should apply watermark when enabled', async () => {
      // Create share link with watermark enabled
      const watermarkedLink = { ...testShareLink, watermarkEnabled: true };

      const response = await request(app.getHttpServer())
        .post(`/api/s/${watermarkedLink.shortCode}/download`)
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toBeDefined();
      // Note: Verifying watermark application would require PDF parsing
    });

    it('should increment download count after successful download', async () => {
      await request(app.getHttpServer())
        .post(`/api/s/${testShareLink.shortCode}/download`)
        .send({})
        .expect(200);

      // Verify download count increased
      const statsResponse = await request(app.getHttpServer())
        .get(`/api/share-links/${testShareLink.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.downloadCount).toBeGreaterThan(0);
    });

    it('should fail with 403 when share link has expired', async () => {
      // Create expired share link
      // TODO: Create expired test share link

      const response = await request(app.getHttpServer())
        .post(`/api/s/expired-code/download`)
        .send({})
        .expect(403);

      expect(response.body.message).toContain('expired');
    });

    it('should fail with 403 when download is not allowed', async () => {
      // Create share link with allowDownload: false
      // TODO: Create test share link with allowDownload: false

      const response = await request(app.getHttpServer())
        .post(`/api/s/no-download-code/download`)
        .send({})
        .expect(403);

      expect(response.body.message).toContain('not allowed');
    });

    it('should fail with 401 when password is required but not provided', async () => {
      // Create password-protected share link
      // TODO: Create test share link with password

      const response = await request(app.getHttpServer())
        .post(`/api/s/password-protected-code/download`)
        .send({})
        .expect(401);

      expect(response.body.message).toContain('Password required');
    });

    it('should succeed with correct password', async () => {
      // Create password-protected share link
      // TODO: Create test share link with password

      const response = await request(app.getHttpServer())
        .post(`/api/s/password-protected-code/download`)
        .send({ password: 'correct-password' })
        .expect(200);

      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should fail with 401 when email is required but not provided', async () => {
      // Create email-required share link
      // TODO: Create test share link with requireEmail: true

      const response = await request(app.getHttpServer())
        .post(`/api/s/email-required-code/download`)
        .send({})
        .expect(401);

      expect(response.body.message).toContain('Email required');
    });

    it('should fail with 403 when email is not in allowed list', async () => {
      // Create share link with allowed emails
      // TODO: Create test share link with allowedEmails

      const response = await request(app.getHttpServer())
        .post(`/api/s/email-restricted-code/download`)
        .send({ email: 'notallowed@example.com' })
        .expect(403);

      expect(response.body.message).toContain('not authorized');
    });

    it('should fail with 403 when download limit is exceeded', async () => {
      // Create share link with max downloads limit
      // TODO: Create test share link with maxDownloads: 1

      // First download succeeds
      await request(app.getHttpServer())
        .post(`/api/s/limited-code/download`)
        .send({})
        .expect(200);

      // Second download fails
      const response = await request(app.getHttpServer())
        .post(`/api/s/limited-code/download`)
        .send({})
        .expect(403);

      expect(response.body.message).toContain('limit exceeded');
    });

    it('should fail with 404 when share link does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/s/nonexistent-code/download')
        .send({})
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should track IP address in access log', async () => {
      await request(app.getHttpServer())
        .post(`/api/s/${testShareLink.shortCode}/download`)
        .send({})
        .expect(200);

      // TODO: Verify IP address was logged in access log
    });

    it('should track user agent in access log', async () => {
      await request(app.getHttpServer())
        .post(`/api/s/${testShareLink.shortCode}/download`)
        .set('User-Agent', 'Test Browser/1.0')
        .send({})
        .expect(200);

      // TODO: Verify user agent was logged in access log
    });
  });
});
