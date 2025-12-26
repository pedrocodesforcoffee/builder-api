import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentUpload, UploadStatus, UploadType } from '../../src/modules/documents/entities/document-upload.entity';
import { Document } from '../../src/modules/documents/entities/document.entity';
import { DocumentVersion } from '../../src/modules/documents/entities/document-version.entity';
import { DocumentsModule } from '../../src/modules/documents/documents.module';
import { S3Service } from '../../src/common/services/s3.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Document Upload (e2e)', () => {
  let app: INestApplication;
  let uploadRepository: Repository<DocumentUpload>;
  let documentRepository: Repository<Document>;
  let versionRepository: Repository<DocumentVersion>;
  let s3Service: S3Service;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174001';

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
          entities: [DocumentUpload, Document, DocumentVersion],
          synchronize: true, // Only for tests
          dropSchema: true, // Clean slate for each test run
        }),
        DocumentsModule,
      ],
    })
      .overrideProvider(S3Service)
      .useValue({
        getPresignedPostUrl: jest.fn().mockResolvedValue({
          url: 'https://mock-s3-url.com',
          fields: { key: 'test-key', policy: 'test-policy' },
          s3Key: 'test-s3-key',
          expiresAt: new Date(Date.now() + 3600000),
        }),
        initializeMultipartUpload: jest.fn().mockResolvedValue({
          uploadId: 'mock-s3-upload-id',
          s3Key: 'test-s3-key',
        }),
        getPresignedPartUrl: jest.fn().mockResolvedValue('https://mock-part-url.com'),
        completeMultipartUpload: jest.fn().mockResolvedValue(undefined),
        abortMultipartUpload: jest.fn().mockResolvedValue(undefined),
        getPresignedGetUrl: jest.fn().mockResolvedValue('https://mock-download-url.com'),
        deleteObject: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    uploadRepository = moduleFixture.get(getRepositoryToken(DocumentUpload));
    documentRepository = moduleFixture.get(getRepositoryToken(Document));
    versionRepository = moduleFixture.get(getRepositoryToken(DocumentVersion));
    s3Service = moduleFixture.get(S3Service);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await uploadRepository.delete({});
    await versionRepository.delete({});
    await documentRepository.delete({});
  });

  describe('POST /api/documents/upload/single/initiate', () => {
    it('should initiate a single upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'test-document.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentName: 'Test Document',
          documentType: 'specification',
        })
        .expect(201);

      expect(response.body).toHaveProperty('uploadId');
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('uploadFields');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify database record
      const upload = await uploadRepository.findOne({
        where: { id: response.body.uploadId },
      });
      expect(upload).toBeDefined();
      expect(upload?.status).toBe(UploadStatus.INITIATED);
      expect(upload?.uploadType).toBe(UploadType.SINGLE);
    });

    it('should reject file size exceeding limit', async () => {
      await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'huge-file.pdf',
          fileSize: 10 * 1024 * 1024 * 1024, // 10GB
          mimeType: 'application/pdf',
          documentName: 'Huge Document',
          documentType: 'specification',
        })
        .expect(400);
    });

    it('should reject invalid mime type', async () => {
      await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'test.exe',
          fileSize: 1024000,
          mimeType: 'application/x-msdownload',
          documentName: 'Test Document',
          documentType: 'specification',
        })
        .expect(400);
    });
  });

  describe('POST /api/documents/upload/multipart/initiate', () => {
    it('should initiate a multipart upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload/multipart/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'large-document.pdf',
          fileSize: 100 * 1024 * 1024, // 100MB
          mimeType: 'application/pdf',
          documentName: 'Large Document',
          documentType: 'specification',
        })
        .expect(201);

      expect(response.body).toHaveProperty('uploadId');
      expect(response.body).toHaveProperty('s3UploadId');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('partSize');
      expect(response.body).toHaveProperty('totalParts');

      // Verify database record
      const upload = await uploadRepository.findOne({
        where: { id: response.body.uploadId },
      });
      expect(upload).toBeDefined();
      expect(upload?.status).toBe(UploadStatus.INITIATED);
      expect(upload?.uploadType).toBe(UploadType.MULTIPART);
      expect(upload?.s3UploadId).toBe('mock-s3-upload-id');
    });
  });

  describe('GET /api/documents/upload/:uploadId/part/:partNumber', () => {
    it('should get part upload URL', async () => {
      // Create a multipart upload first
      const initiateResponse = await request(app.getHttpServer())
        .post('/api/documents/upload/multipart/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'large-document.pdf',
          fileSize: 100 * 1024 * 1024,
          mimeType: 'application/pdf',
          documentName: 'Large Document',
          documentType: 'specification',
        });

      const uploadId = initiateResponse.body.uploadId;

      // Update status to uploading
      await uploadRepository.update(uploadId, { status: UploadStatus.UPLOADING });

      const response = await request(app.getHttpServer())
        .get(`/api/documents/upload/${uploadId}/part/1`)
        .expect(200);

      expect(response.body).toHaveProperty('partNumber', 1);
      expect(response.body).toHaveProperty('uploadUrl');
    });

    it('should return 404 for non-existent upload', async () => {
      await request(app.getHttpServer())
        .get('/api/documents/upload/non-existent-id/part/1')
        .expect(404);
    });
  });

  describe('POST /api/documents/upload/multipart/:uploadId/complete', () => {
    it('should complete multipart upload and create document', async () => {
      // Create a multipart upload
      const initiateResponse = await request(app.getHttpServer())
        .post('/api/documents/upload/multipart/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'large-document.pdf',
          fileSize: 100 * 1024 * 1024,
          mimeType: 'application/pdf',
          documentName: 'Large Document',
          documentType: 'specification',
        });

      const uploadId = initiateResponse.body.uploadId;

      // Update status to uploading
      await uploadRepository.update(uploadId, { status: UploadStatus.UPLOADING });

      const response = await request(app.getHttpServer())
        .post(`/api/documents/upload/multipart/${uploadId}/complete`)
        .send({
          parts: [
            { PartNumber: 1, ETag: 'etag1' },
            { PartNumber: 2, ETag: 'etag2' },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('uploadId', uploadId);
      expect(response.body).toHaveProperty('status', UploadStatus.PROCESSING);
      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('versionId');

      // Verify document and version were created
      const document = await documentRepository.findOne({
        where: { id: response.body.documentId },
      });
      expect(document).toBeDefined();
      expect(document?.name).toBe('Large Document');

      const version = await versionRepository.findOne({
        where: { id: response.body.versionId },
      });
      expect(version).toBeDefined();
      expect(version?.versionNumber).toBe(1);
    });
  });

  describe('POST /api/documents/upload/single/:uploadId/complete', () => {
    it('should complete single upload and create document', async () => {
      // Create a single upload
      const initiateResponse = await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'test-document.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentName: 'Test Document',
          documentType: 'specification',
        });

      const uploadId = initiateResponse.body.uploadId;

      // Update status to uploaded
      await uploadRepository.update(uploadId, { status: UploadStatus.UPLOADED });

      const response = await request(app.getHttpServer())
        .post(`/api/documents/upload/single/${uploadId}/complete`)
        .expect(200);

      expect(response.body).toHaveProperty('uploadId', uploadId);
      expect(response.body).toHaveProperty('status', UploadStatus.PROCESSING);
      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('versionId');

      // Verify document and version were created
      const document = await documentRepository.findOne({
        where: { id: response.body.documentId },
      });
      expect(document).toBeDefined();

      const version = await versionRepository.findOne({
        where: { id: response.body.versionId },
      });
      expect(version).toBeDefined();
    });
  });

  describe('GET /api/documents/upload/:uploadId/status', () => {
    it('should get upload status', async () => {
      // Create an upload
      const initiateResponse = await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'test-document.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentName: 'Test Document',
          documentType: 'specification',
        });

      const uploadId = initiateResponse.body.uploadId;

      const response = await request(app.getHttpServer())
        .get(`/api/documents/upload/${uploadId}/status`)
        .expect(200);

      expect(response.body).toHaveProperty('uploadId', uploadId);
      expect(response.body).toHaveProperty('status', UploadStatus.INITIATED);
      expect(response.body).toHaveProperty('processingStatus');
    });
  });

  describe('DELETE /api/documents/upload/:uploadId', () => {
    it('should abort upload', async () => {
      // Create a multipart upload
      const initiateResponse = await request(app.getHttpServer())
        .post('/api/documents/upload/multipart/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'large-document.pdf',
          fileSize: 100 * 1024 * 1024,
          mimeType: 'application/pdf',
          documentName: 'Large Document',
          documentType: 'specification',
        });

      const uploadId = initiateResponse.body.uploadId;

      // Update status to uploading
      await uploadRepository.update(uploadId, { status: UploadStatus.UPLOADING });

      await request(app.getHttpServer())
        .delete(`/api/documents/upload/${uploadId}`)
        .expect(200);

      // Verify upload was aborted
      const upload = await uploadRepository.findOne({
        where: { id: uploadId },
      });
      expect(upload?.status).toBe(UploadStatus.ABORTED);

      // Verify S3 abort was called
      expect(s3Service.abortMultipartUpload).toHaveBeenCalled();
    });
  });

  describe('GET /api/documents/upload/project/:projectId', () => {
    it('should list project uploads', async () => {
      // Create multiple uploads
      await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'doc1.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentName: 'Document 1',
          documentType: 'specification',
        });

      await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'doc2.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          documentName: 'Document 2',
          documentType: 'specification',
        });

      const response = await request(app.getHttpServer())
        .get(`/api/documents/upload/project/${mockProjectId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('uploadId');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('fileName');
    });
  });

  describe('Complete Upload Flow', () => {
    it('should complete the full upload lifecycle for a single upload', async () => {
      // 1. Initiate upload
      const initiateRes = await request(app.getHttpServer())
        .post('/api/documents/upload/single/initiate')
        .send({
          projectId: mockProjectId,
          fileName: 'full-lifecycle.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentName: 'Full Lifecycle Test',
          documentType: 'specification',
        })
        .expect(201);

      const uploadId = initiateRes.body.uploadId;

      // 2. Check status (should be INITIATED)
      let statusRes = await request(app.getHttpServer())
        .get(`/api/documents/upload/${uploadId}/status`)
        .expect(200);
      expect(statusRes.body.status).toBe(UploadStatus.INITIATED);

      // 3. Simulate file upload completion
      await uploadRepository.update(uploadId, { status: UploadStatus.UPLOADED });

      // 4. Complete upload
      const completeRes = await request(app.getHttpServer())
        .post(`/api/documents/upload/single/${uploadId}/complete`)
        .expect(200);

      expect(completeRes.body.status).toBe(UploadStatus.PROCESSING);
      expect(completeRes.body.documentId).toBeDefined();
      expect(completeRes.body.versionId).toBeDefined();

      // 5. Check final status
      statusRes = await request(app.getHttpServer())
        .get(`/api/documents/upload/${uploadId}/status`)
        .expect(200);
      expect(statusRes.body.status).toBe(UploadStatus.PROCESSING);
      expect(statusRes.body.documentId).toBe(completeRes.body.documentId);
      expect(statusRes.body.versionId).toBe(completeRes.body.versionId);
    });
  });
});
