import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { DocumentUpload } from '../entities/document-upload.entity';
import { S3Service } from '../../../common/services/s3.service';
import { QUEUE_NAMES, JOB_NAMES } from '../constants/queue-names';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

interface ThumbnailJobData {
  uploadId: string;
}

@Processor(QUEUE_NAMES.DOCUMENT_PROCESSING)
export class ThumbnailProcessor {
  private readonly logger = new Logger(ThumbnailProcessor.name);

  // Thumbnail sizes
  private readonly THUMBNAIL_SIZES = [
    { name: 'small', width: 150, height: 150 },
    { name: 'medium', width: 300, height: 300 },
    { name: 'large', width: 600, height: 600 },
  ];

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    private s3Service: S3Service,
  ) {}

  @Process(JOB_NAMES.GENERATE_THUMBNAIL)
  async handleThumbnailGeneration(job: Job<ThumbnailJobData>): Promise<void> {
    const { uploadId } = job.data;

    this.logger.log(`Starting thumbnail generation for upload: ${uploadId}`);

    try {
      // Get upload record
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error(`Upload not found: ${uploadId}`);
      }

      // Update processing status
      upload.processingStatus = {
        ...upload.processingStatus,
        thumbnails: {
          status: 'processing',
          startedAt: new Date().toISOString(),
        },
      };
      await this.uploadRepository.save(upload);

      // Check if file type supports thumbnails
      if (!this.supportsThumbnails(upload.mimeType)) {
        this.logger.log(
          `File type ${upload.mimeType} does not support thumbnails, skipping`,
        );
        upload.processingStatus = {
          ...upload.processingStatus,
          thumbnails: {
            status: 'skipped',
            completedAt: new Date().toISOString(),
            message: 'File type does not support thumbnails',
          },
        };
        await this.uploadRepository.save(upload);
        return;
      }

      // Download file from S3
      const fileBuffer = await this.s3Service.getObject(upload.s3Key);

      // Generate thumbnails for each size
      const thumbnailUrls: Record<string, string> = {};

      for (const size of this.THUMBNAIL_SIZES) {
        try {
          const thumbnailBuffer = await sharp(fileBuffer)
            .resize(size.width, size.height, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload thumbnail to S3
          const thumbnailKey = this.getThumbnailKey(
            upload.s3Key,
            size.name,
          );
          await this.s3Service.putObject(
            thumbnailKey,
            thumbnailBuffer,
            'image/jpeg',
          );

          // Generate pre-signed URL for thumbnail
          thumbnailUrls[size.name] = await this.s3Service.getPresignedGetUrl(
            thumbnailKey,
            3600 * 24 * 365, // 1 year
          );

          this.logger.log(
            `Generated ${size.name} thumbnail for upload: ${uploadId}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Error generating ${size.name} thumbnail:`,
            error.message,
          );
        }
      }

      // Update upload with thumbnail URLs
      upload.processingStatus = {
        ...upload.processingStatus,
        thumbnails: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          urls: thumbnailUrls,
        },
      };
      await this.uploadRepository.save(upload);

      this.logger.log(
        `Thumbnail generation completed successfully for: ${uploadId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error generating thumbnails for upload ${uploadId}:`,
        error.stack,
      );

      // Update upload with error
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
      });

      if (upload) {
        upload.processingStatus = {
          ...upload.processingStatus,
          thumbnails: {
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: error.message,
          },
        };
        await this.uploadRepository.save(upload);
      }

      throw error;
    }
  }

  /**
   * Check if MIME type supports thumbnail generation
   */
  private supportsThumbnails(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'application/pdf',
    ];
    return supportedTypes.includes(mimeType);
  }

  /**
   * Generate thumbnail S3 key
   */
  private getThumbnailKey(originalKey: string, size: string): string {
    const parts = originalKey.split('/');
    const fileName = parts.pop();
    const fileNameWithoutExt = fileName?.split('.').slice(0, -1).join('.');
    return `${parts.join('/')}/thumbnails/${fileNameWithoutExt}_${size}.jpg`;
  }
}
