import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentUpload,
  UploadStatus,
  UploadType,
} from '../entities/document-upload.entity';
import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { S3Service } from '../../../common/services/s3.service';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import {
  SingleUploadResponseDto,
  MultipartUploadResponseDto,
  CompleteUploadResponseDto,
  AbortUploadResponseDto,
  UploadStatusResponseDto,
} from '../dto/upload-responses.dto';
import { DocumentType, DocumentStatus } from '../enums';
import { QUEUE_NAMES, JOB_NAMES } from '../constants/queue-names';
import { validateFileType, requiresSecurityProcessing } from '../utils/file-type-validator';
import { processDangerousFile } from '../utils/dangerous-file-handler';
import {
  sanitizeFileName,
  sanitizeDocumentName,
  sanitizeDescription,
  sanitizeTags,
  sanitizeMetadata,
  sanitizeS3Key,
} from '../utils/sanitize';
import { S3_BUCKETS } from '../../../common/constants/s3-buckets';

@Injectable()
export class DocumentUploadService {
  private readonly logger = new Logger(DocumentUploadService.name);

  // Configuration constants
  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
  private readonly PART_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly PRESIGN_EXPIRY = 900; // 15 minutes
  private readonly UPLOAD_EXPIRY_HOURS = 24;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

  // Allowed MIME types
  private readonly ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    // CAD
    'application/acad',
    'application/dwg',
    'application/dxf',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Video
    'video/mp4',
    'video/quicktime',
  ];

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
    private s3Service: S3Service,
    @InjectQueue(QUEUE_NAMES.DOCUMENT_PROCESSING)
    private documentQueue: Queue,
  ) {}

  /**
   * Initiate a new document upload
   */
  async initiateUpload(
    projectId: string,
    dto: InitiateUploadDto,
    userId: string,
  ): Promise<SingleUploadResponseDto | MultipartUploadResponseDto> {
    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(
        `File type '${dto.mimeType}' is not allowed`,
      );
    }

    // Validate file size
    if (dto.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`,
      );
    }

    // Generate S3 key
    const s3Key = this.generateS3Key(projectId, dto.folderId, dto.fileName);

    // Determine upload type
    const isMultipart = dto.fileSize >= this.MULTIPART_THRESHOLD;

    if (isMultipart) {
      return this.initiateMultipartUpload(projectId, dto, userId, s3Key);
    } else {
      return this.initiateSingleUpload(projectId, dto, userId, s3Key);
    }
  }

  /**
   * Initiate a single-part upload
   *
   * SECURITY: Files are uploaded to QUARANTINE bucket first
   */
  private async initiateSingleUpload(
    projectId: string,
    dto: InitiateUploadDto,
    userId: string,
    s3Key: string,
  ): Promise<SingleUploadResponseDto> {
    // CRITICAL SECURITY: Upload to QUARANTINE bucket
    const quarantineBucket = this.s3Service.getQuarantineBucket();

    // Create pre-signed URL for quarantine bucket
    const presignedUrl = await this.s3Service.getPresignedPutUrl(
      s3Key,
      dto.mimeType,
      this.PRESIGN_EXPIRY,
      this.MAX_FILE_SIZE,
      quarantineBucket,
    );

    // Create upload record with QUARANTINE bucket
    const upload = this.uploadRepository.create({
      projectId,
      folderId: dto.folderId || null,
      status: UploadStatus.INITIATED,
      uploadType: UploadType.SINGLE,
      originalFileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      s3Key,
      s3Bucket: quarantineBucket,
      requestedMetadata: dto.metadata || {},
      uploadedById: userId,
      expiresAt: new Date(
        Date.now() + this.UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
    });

    await this.uploadRepository.save(upload);

    return {
      uploadId: upload.id,
      uploadType: 'single',
      presignedUrl,
      presignedUrlExpires: new Date(
        Date.now() + this.PRESIGN_EXPIRY * 1000,
      ).toISOString(),
      s3Key,
      maxFileSize: this.MAX_FILE_SIZE,
    };
  }

  /**
   * Initiate a multipart upload
   *
   * SECURITY: Files are uploaded to QUARANTINE bucket first
   */
  private async initiateMultipartUpload(
    projectId: string,
    dto: InitiateUploadDto,
    userId: string,
    s3Key: string,
  ): Promise<MultipartUploadResponseDto> {
    // CRITICAL SECURITY: Upload to QUARANTINE bucket
    const quarantineBucket = this.s3Service.getQuarantineBucket();

    // Initiate S3 multipart upload
    const s3UploadId = await this.s3Service.createMultipartUpload(
      s3Key,
      dto.mimeType,
    );

    // Calculate parts
    const totalParts = Math.ceil(dto.fileSize / this.PART_SIZE);

    // Generate pre-signed URLs for all parts
    const parts = await Promise.all(
      Array.from({ length: totalParts }, async (_, i) => {
        const partNumber = i + 1;
        const presignedUrl = await this.s3Service.getPresignedUploadPartUrl(
          s3Key,
          s3UploadId,
          partNumber,
          this.PRESIGN_EXPIRY,
        );
        return {
          partNumber,
          presignedUrl,
          presignedUrlExpires: new Date(
            Date.now() + this.PRESIGN_EXPIRY * 1000,
          ).toISOString(),
        };
      }),
    );

    // Create upload record with QUARANTINE bucket
    const upload = this.uploadRepository.create({
      projectId,
      folderId: dto.folderId || null,
      status: UploadStatus.INITIATED,
      uploadType: UploadType.MULTIPART,
      originalFileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      s3Key,
      s3Bucket: quarantineBucket,
      s3UploadId,
      totalParts,
      completedParts: [],
      requestedMetadata: dto.metadata || {},
      uploadedById: userId,
      expiresAt: new Date(
        Date.now() + this.UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
    });

    await this.uploadRepository.save(upload);

    return {
      uploadId: upload.id,
      uploadType: 'multipart',
      s3UploadId,
      s3Key,
      partSize: this.PART_SIZE,
      totalParts,
      parts,
    };
  }

  /**
   * Complete an upload and create document/version
   */
  async completeUpload(
    uploadId: string,
    dto: CompleteUploadDto,
    userId: string,
  ): Promise<CompleteUploadResponseDto> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
      relations: ['project'],
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    if (upload.uploadedById !== userId) {
      throw new ForbiddenException('You do not own this upload');
    }

    if (upload.status === UploadStatus.COMPLETE) {
      throw new BadRequestException('Upload already completed');
    }

    if (upload.status === UploadStatus.ABORTED) {
      throw new BadRequestException('Upload was aborted');
    }

    // For multipart, complete the S3 upload
    if (upload.uploadType === UploadType.MULTIPART) {
      if (!dto.parts || dto.parts.length === 0) {
        throw new BadRequestException(
          'Parts required for multipart upload completion',
        );
      }

      await this.s3Service.completeMultipartUpload(
        upload.s3Key,
        upload.s3UploadId!,
        dto.parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      );
    }

    // CRITICAL SECURITY: Validate uploaded file content
    await this.validateUploadedFile(upload);

    // Update upload status
    upload.status = UploadStatus.UPLOADED;
    await this.uploadRepository.save(upload);

    // Create document and version
    const { document, version } = await this.createDocumentFromUpload(
      upload,
      dto,
    );

    // Update upload with document reference
    upload.documentId = document.id;
    upload.versionId = version.id;
    upload.status = UploadStatus.PROCESSING;
    upload.completedAt = new Date();
    await this.uploadRepository.save(upload);

    // Enqueue processing jobs
    await this.enqueueProcessingJobs(upload.id);

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
      },
    };
  }

  /**
   * Validate uploaded file content (CRITICAL SECURITY)
   *
   * Validates file using magic bytes and checks for dangerous content.
   * This prevents attacks where malicious files are uploaded with fake extensions.
   */
  private async validateUploadedFile(upload: DocumentUpload): Promise<void> {
    try {
      // Download file from S3 (from quarantine bucket)
      const fileBuffer = await this.s3Service.getObject(upload.s3Key, upload.s3Bucket);

      // STEP 1: Magic byte validation
      const validation = await validateFileType(
        fileBuffer,
        upload.mimeType,
        upload.originalFileName,
      );

      if (!validation.valid) {
        this.logger.warn(
          `File type validation failed for upload ${upload.id}: ${validation.reason}`,
        );
        throw new BadRequestException(
          `File validation failed: ${validation.reason}`,
        );
      }

      // Log if high security risk detected
      if (validation.securityRisk === 'high' || validation.securityRisk === 'medium') {
        this.logger.warn(
          `High/medium risk file uploaded: ${upload.id}, type: ${validation.detectedType}`,
        );
      }

      // STEP 2: Check if file type requires dangerous content processing
      if (requiresSecurityProcessing(validation.detectedType)) {
        this.logger.log(
          `Processing dangerous file type for upload ${upload.id}: ${validation.detectedType}`,
        );

        const securityCheck = await processDangerousFile(
          fileBuffer,
          validation.detectedType,
        );

        if (!securityCheck.safe) {
          this.logger.error(
            `Dangerous content detected in upload ${upload.id}: ${securityCheck.reason}`,
            securityCheck.threats,
          );
          throw new BadRequestException(
            `File rejected for security reasons: ${securityCheck.reason}`,
          );
        }

        // If file was sanitized, upload the sanitized version
        if (securityCheck.sanitized) {
          this.logger.log(
            `Uploading sanitized version of file for upload ${upload.id}`,
          );
          await this.s3Service.putObject(
            upload.s3Key,
            securityCheck.sanitized,
            upload.mimeType,
            upload.s3Bucket,
          );
        }
      }

      this.logger.log(`File validation successful for upload ${upload.id}`);
    } catch (error: any) {
      this.logger.error(
        `File validation error for upload ${upload.id}:`,
        error.stack,
      );

      // Update upload status to FAILED
      upload.status = UploadStatus.FAILED;
      upload.errorCode = 'VALIDATION_FAILED';
      upload.errorMessage = error.message;
      await this.uploadRepository.save(upload);

      throw error;
    }
  }

  /**
   * Create document and version from upload
   */
  private async createDocumentFromUpload(
    upload: DocumentUpload,
    dto: CompleteUploadDto,
  ): Promise<{ document: Document; version: DocumentVersion }> {
    // CRITICAL SECURITY: Sanitize all user inputs
    const sanitizedDocumentName = dto.documentName
      ? sanitizeDocumentName(dto.documentName)
      : sanitizeDocumentName(upload.originalFileName);

    const sanitizedDescription = dto.description
      ? sanitizeDescription(dto.description)
      : (upload.requestedMetadata.description
          ? sanitizeDescription(upload.requestedMetadata.description as string)
          : '');

    const sanitizedTags = dto.tags
      ? sanitizeTags(dto.tags)
      : (upload.requestedMetadata.tags
          ? sanitizeTags(upload.requestedMetadata.tags as string[])
          : []);

    const sanitizedMetadata = upload.requestedMetadata.customFields
      ? sanitizeMetadata(upload.requestedMetadata.customFields as Record<string, any>)
      : {};

    // Create document with QUARANTINED status (SECURITY CRITICAL)
    // Document will remain QUARANTINED until virus scan passes
    const document = this.documentRepository.create({
      projectId: upload.projectId,
      folderId: upload.folderId,
      name: sanitizedDocumentName,
      number: dto.documentNumber || null,
      revision: dto.revision || '1',
      documentType:
        (upload.requestedMetadata.documentType as DocumentType) ||
        DocumentType.OTHER,
      status: DocumentStatus.QUARANTINED,
      description: sanitizedDescription,
      tags: sanitizedTags,
      metadata: sanitizedMetadata,
      createdById: upload.uploadedById,
    });

    await this.documentRepository.save(document);

    // Create version
    const version = this.versionRepository.create({
      documentId: document.id,
      versionNumber: 1,
      versionLabel: '1.0',
      isLatest: true,
      fileName: this.generateVersionFileName(upload.originalFileName, 1),
      originalFileName: sanitizeFileName(upload.originalFileName),
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      s3Key: upload.s3Key,
      s3Bucket: upload.s3Bucket,
      uploadedById: upload.uploadedById,
      sourceType: 'upload',
    });

    await this.versionRepository.save(version);

    // Update document with current version
    document.currentVersionId = version.id;
    await this.documentRepository.save(document);

    return { document, version };
  }

  /**
   * Abort an upload
   */
  async abortUpload(
    uploadId: string,
    userId: string,
  ): Promise<AbortUploadResponseDto> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    if (upload.uploadedById !== userId) {
      throw new ForbiddenException('You do not own this upload');
    }

    let s3ObjectsDeleted = 0;

    // Abort S3 multipart upload if applicable
    if (upload.uploadType === UploadType.MULTIPART && upload.s3UploadId) {
      await this.s3Service.abortMultipartUpload(
        upload.s3Key,
        upload.s3UploadId,
      );
      s3ObjectsDeleted = upload.completedParts?.length || 0;
    }

    // Update status
    upload.status = UploadStatus.ABORTED;
    await this.uploadRepository.save(upload);

    return {
      success: true,
      cleanedUp: {
        s3Objects: s3ObjectsDeleted,
        dbRecords: 1,
      },
    };
  }

  /**
   * Get upload status
   */
  async getUploadStatus(
    uploadId: string,
    userId: string,
  ): Promise<UploadStatusResponseDto> {
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    return {
      uploadId: upload.id,
      status: upload.status,
      documentId: upload.documentId || undefined,
      versionId: upload.versionId || undefined,
      error: upload.errorCode
        ? {
            code: upload.errorCode,
            message: upload.errorMessage || '',
          }
        : undefined,
    };
  }

  // ==================== UTILITY METHODS ====================

  private generateS3Key(
    projectId: string,
    folderId: string | undefined,
    fileName: string,
  ): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const sanitizedName = sanitizeFileName(fileName);
    const folderPath = folderId ? `folders/${folderId}` : 'root';

    const key = `projects/${projectId}/${folderPath}/documents/${timestamp}-${uuid}/${sanitizedName}`;
    return sanitizeS3Key(key);
  }

  private generateVersionFileName(
    originalName: string,
    versionNumber: number,
  ): string {
    const ext = originalName.split('.').pop();
    const baseName = originalName.replace(`.${ext}`, '');
    return `${baseName}_v${versionNumber}.${ext}`;
  }

  /**
   * Enqueue processing jobs for uploaded document
   */
  private async enqueueProcessingJobs(uploadId: string): Promise<void> {
    try {
      // Virus scan (high priority - must complete first)
      await this.documentQueue.add(
        JOB_NAMES.VIRUS_SCAN,
        { uploadId },
        {
          priority: 1,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      // Thumbnail generation (medium priority)
      await this.documentQueue.add(
        JOB_NAMES.GENERATE_THUMBNAIL,
        { uploadId },
        {
          priority: 2,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      // OCR extraction (low priority)
      await this.documentQueue.add(
        JOB_NAMES.EXTRACT_TEXT_OCR,
        { uploadId },
        {
          priority: 3,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      // Metadata extraction (low priority)
      await this.documentQueue.add(
        JOB_NAMES.EXTRACT_METADATA,
        { uploadId },
        {
          priority: 3,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      this.logger.log(
        `Enqueued processing jobs for upload: ${uploadId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error enqueueing processing jobs for upload ${uploadId}:`,
        error.stack,
      );
      throw error;
    }
  }
}
