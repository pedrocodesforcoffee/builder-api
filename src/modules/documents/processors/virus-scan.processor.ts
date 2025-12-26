import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { DocumentUpload, UploadStatus } from '../entities/document-upload.entity';
import { Document } from '../entities/document.entity';
import { DocumentStatus } from '../enums';
import { S3Service } from '../../../common/services/s3.service';
import { QUEUE_NAMES, JOB_NAMES } from '../constants/queue-names';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NodeClam = require('clamscan');

interface VirusScanJobData {
  uploadId: string;
}

@Processor(QUEUE_NAMES.DOCUMENT_PROCESSING)
export class VirusScanProcessor {
  private readonly logger = new Logger(VirusScanProcessor.name);
  private clamScan: any | null = null;
  private clamAvailable = false;

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private s3Service: S3Service,
  ) {
    this.initializeClamAV();
  }

  /**
   * Initialize ClamAV scanner
   */
  private async initializeClamAV(): Promise<void> {
    try {
      this.clamScan = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        debugMode: false,
        scanLog: null,
        clamscan: {
          path: '/usr/local/bin/clamscan',
          db: '/usr/local/share/clamav',
          scanArchives: true,
          active: true,
        },
        clamdscan: {
          socket: false,
          host: 'localhost',
          port: 3310,
          timeout: 60000,
          localFallback: true,
          path: '/usr/local/bin/clamdscan',
          configFile: null,
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false,
        },
        preference: 'clamdscan',
      });

      this.clamAvailable = true;
      this.logger.log('ClamAV initialized successfully');
    } catch (error) {
      this.logger.warn(
        'ClamAV not available, virus scanning will be skipped',
        error,
      );
      this.clamAvailable = false;
    }
  }

  @Process(JOB_NAMES.VIRUS_SCAN)
  async handleVirusScan(job: Job<VirusScanJobData>): Promise<void> {
    const { uploadId } = job.data;

    this.logger.log(`Starting virus scan for upload: ${uploadId}`);

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
        virusScan: {
          status: 'processing',
          startedAt: new Date().toISOString(),
        },
      };
      await this.uploadRepository.save(upload);

      // If ClamAV is not available, mark as skipped
      if (!this.clamAvailable || !this.clamScan) {
        this.logger.warn(
          `ClamAV not available, skipping virus scan for: ${uploadId}`,
        );
        upload.processingStatus = {
          ...upload.processingStatus,
          virusScan: {
            status: 'skipped',
            completedAt: new Date().toISOString(),
            message: 'ClamAV not available',
          },
        };
        await this.uploadRepository.save(upload);
        return;
      }

      // CRITICAL SECURITY: Download file from QUARANTINE bucket
      const tempFilePath = `/tmp/${uploadId}-${Date.now()}`;
      const quarantineBucket = this.s3Service.getQuarantineBucket();
      const fileBuffer = await this.s3Service.getObject(
        upload.s3Key,
        quarantineBucket,
      );
      const fs = await import('fs/promises');
      await fs.writeFile(tempFilePath, fileBuffer);

      try {
        // Scan file
        const { isInfected, viruses } = await this.clamScan.isInfected(
          tempFilePath,
        );

        if (isInfected) {
          this.logger.error(
            `Virus detected in upload ${uploadId}: ${viruses.join(', ')}`,
          );

          // Mark upload as failed
          upload.status = UploadStatus.FAILED;
          upload.errorCode = 'VIRUS_DETECTED';
          upload.errorMessage = `Virus detected: ${viruses.join(', ')}`;
          upload.processingStatus = {
            ...upload.processingStatus,
            virusScan: {
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: `Virus detected: ${viruses.join(', ')}`,
              viruses,
            },
          };

          // CRITICAL SECURITY: Delete infected file from QUARANTINE bucket
          await this.s3Service.deleteObject(upload.s3Key, quarantineBucket);

          this.logger.log(
            `Deleted infected file from quarantine: ${upload.s3Key}`,
          );
        } else {
          // CRITICAL SECURITY: Move file from QUARANTINE to PRODUCTION bucket
          this.logger.log(
            `Moving file from quarantine to production: ${upload.s3Key}`,
          );
          await this.s3Service.moveFromQuarantineToProduction(upload.s3Key);

          // Update document status from QUARANTINED to DRAFT
          if (upload.documentId) {
            const document = await this.documentRepository.findOne({
              where: { id: upload.documentId },
            });

            if (document && document.status === DocumentStatus.QUARANTINED) {
              document.status = DocumentStatus.DRAFT;
              await this.documentRepository.save(document);
              this.logger.log(
                `Updated document ${document.id} status to DRAFT`,
              );
            }
          }

          // Update s3Bucket to production
          upload.s3Bucket = this.s3Service.getProductionBucket();

          // Mark scan as successful
          upload.processingStatus = {
            ...upload.processingStatus,
            virusScan: {
              status: 'completed',
              completedAt: new Date().toISOString(),
              clean: true,
            },
          };

          this.logger.log(`Virus scan completed successfully for: ${uploadId}`);
        }

        await this.uploadRepository.save(upload);
      } finally {
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      }
    } catch (error: any) {
      this.logger.error(
        `Error scanning file for upload ${uploadId}:`,
        error.stack,
      );

      // Update upload with error
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
      });

      if (upload) {
        upload.processingStatus = {
          ...upload.processingStatus,
          virusScan: {
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
}
