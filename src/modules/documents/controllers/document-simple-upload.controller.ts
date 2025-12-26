import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { S3Service } from '../../../common/services/s3.service';
import { ConfigService } from '@nestjs/config';
import { DocumentType, DocumentStatus } from '../enums';

/**
 * Simple Document Upload Controller
 *
 * Provides a simplified upload endpoint for local development (mock S3 mode).
 * Bypasses the presigned URL flow and accepts files directly via multipart/form-data.
 *
 * This is used when USE_MOCK_S3=true to avoid the complexity of presigned URLs.
 */
@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentSimpleUploadController {
  private readonly logger = new Logger(DocumentSimpleUploadController.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Simple file upload endpoint for mock/local development
   *
   * POST /api/projects/:projectId/documents/simple-upload
   *
   * Accepts file via multipart/form-data and creates document directly.
   * Only enabled when USE_MOCK_S3=true.
   */
  @Post('simple-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB
      },
    }),
  )
  async simpleUpload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId: string | undefined,
    @Body('documentName') documentName: string | undefined,
    @Body('description') description: string | undefined,
    @Request() req: any,
  ): Promise<{
    document: {
      id: string;
      name: string;
      number: string | null;
      currentVersionId: string;
      status: string;
    };
    version: {
      id: string;
      versionNumber: number;
      fileName: string;
      fileSize: number;
      mimeType: string;
    };
  }> {
    // Only allow in mock S3 mode
    const useMockS3 =
      this.configService.get<boolean>('USE_MOCK_S3') === true ||
      this.configService.get<string>('USE_MOCK_S3') === 'true';

    if (!useMockS3) {
      throw new BadRequestException(
        'Simple upload is only available in mock S3 mode. Use /initiate-upload endpoint instead.',
      );
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check for authenticated user
    if (!req.user || !req.user.id) {
      this.logger.error('Upload attempted without authenticated user. req.user:', req.user);
      throw new BadRequestException('User authentication required');
    }

    const userId = req.user.id;

    // Generate S3 key
    const timestamp = Date.now();
    const folderPath = folderId ? `folders/${folderId}` : 'root';
    const s3Key = `projects/${projectId}/${folderPath}/documents/${timestamp}/${file.originalname}`;

    this.logger.log(`Simple upload: ${file.originalname} (${file.size} bytes) to project ${projectId}`);

    // Store file using S3Service (which will use local filesystem in mock mode)
    const bucket = this.s3Service.getQuarantineBucket();
    await this.s3Service.putObject(
      s3Key,
      file.buffer,
      file.mimetype,
      bucket,
    );

    // Create document record
    // Note: We skip virus scanning in mock mode (SKIP_VIRUS_SCAN=true)
    const document = this.documentRepo.create({
      projectId,
      folderId: folderId || null,
      name: documentName || file.originalname,
      number: null, // Auto-generated if needed
      revision: '1',
      documentType: DocumentType.OTHER,
      status: DocumentStatus.APPROVED, // Skip quarantine in mock mode
      description: description || '',
      tags: [],
      metadata: {},
      createdById: userId,
    });

    await this.documentRepo.save(document);

    // Create version record
    const version = this.versionRepo.create({
      documentId: document.id,
      versionNumber: 1,
      versionLabel: '1.0',
      isLatest: true,
      fileName: file.originalname,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key,
      s3Bucket: bucket,
      uploadedById: userId,
      sourceType: 'upload',
    });

    await this.versionRepo.save(version);

    // Update document with current version
    document.currentVersionId = version.id;
    await this.documentRepo.save(document);

    this.logger.log(`Document created: ${document.id} with version ${version.id}`);

    return {
      document: {
        id: document.id,
        name: document.name,
        number: document.number,
        currentVersionId: version.id,
        status: document.status,
      },
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        fileName: version.fileName,
        fileSize: Number(version.fileSize),
        mimeType: version.mimeType,
      },
    };
  }
}
