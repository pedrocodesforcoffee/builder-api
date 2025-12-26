import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { DocumentUpload } from '../entities/document-upload.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { S3Service } from '../../../common/services/s3.service';
import { QUEUE_NAMES, JOB_NAMES } from '../constants/queue-names';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExifReader = require('exif-reader');

interface MetadataJobData {
  uploadId: string;
}

@Processor(QUEUE_NAMES.DOCUMENT_PROCESSING)
export class MetadataProcessor {
  private readonly logger = new Logger(MetadataProcessor.name);

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
    private s3Service: S3Service,
  ) {}

  @Process(JOB_NAMES.EXTRACT_METADATA)
  async handleMetadataExtraction(job: Job<MetadataJobData>): Promise<void> {
    const { uploadId } = job.data;

    this.logger.log(`Starting metadata extraction for upload: ${uploadId}`);

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
        metadata: {
          status: 'processing',
          startedAt: new Date().toISOString(),
        },
      };
      await this.uploadRepository.save(upload);

      // Download file from S3
      const fileBuffer = await this.s3Service.getObject(upload.s3Key);

      let metadata: any = {};

      // Extract metadata based on MIME type
      if (upload.mimeType === 'application/pdf') {
        metadata = await this.extractPdfMetadata(fileBuffer);
      } else if (upload.mimeType.startsWith('image/')) {
        metadata = await this.extractImageMetadata(fileBuffer);
      }

      // Update version with extracted metadata
      if (upload.versionId && Object.keys(metadata).length > 0) {
        const version = await this.versionRepository.findOne({
          where: { id: upload.versionId },
        });

        if (version) {
          version.metadata = {
            ...version.metadata,
            extracted: metadata,
            extractedAt: new Date().toISOString(),
          };
          await this.versionRepository.save(version);

          this.logger.log(
            `Extracted metadata for upload: ${uploadId}`,
            metadata,
          );
        }
      }

      // Update upload with metadata extraction results
      upload.processingStatus = {
        ...upload.processingStatus,
        metadata: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          fieldsExtracted: Object.keys(metadata).length,
        },
      };
      await this.uploadRepository.save(upload);

      this.logger.log(
        `Metadata extraction completed successfully for: ${uploadId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error extracting metadata for upload ${uploadId}:`,
        error.stack,
      );

      // Update upload with error
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
      });

      if (upload) {
        upload.processingStatus = {
          ...upload.processingStatus,
          metadata: {
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
   * Extract metadata from PDF
   */
  private async extractPdfMetadata(buffer: Buffer): Promise<any> {
    try {
      const data = await pdfParse(buffer);

      const metadata: any = {
        pages: data.numpages,
        info: data.info || {},
      };

      // Clean up PDF metadata
      if (metadata.info.Title) metadata.title = metadata.info.Title;
      if (metadata.info.Author) metadata.author = metadata.info.Author;
      if (metadata.info.Subject) metadata.subject = metadata.info.Subject;
      if (metadata.info.Creator) metadata.creator = metadata.info.Creator;
      if (metadata.info.Producer) metadata.producer = metadata.info.Producer;
      if (metadata.info.CreationDate) {
        metadata.creationDate = this.parsePdfDate(metadata.info.CreationDate);
      }
      if (metadata.info.ModDate) {
        metadata.modificationDate = this.parsePdfDate(metadata.info.ModDate);
      }

      return metadata;
    } catch (error: any) {
      this.logger.error('Error extracting PDF metadata:', error.message);
      return {};
    }
  }

  /**
   * Extract metadata from image (EXIF data)
   */
  private async extractImageMetadata(buffer: Buffer): Promise<any> {
    try {
      const imageMetadata = await sharp(buffer).metadata();

      const metadata: any = {
        format: imageMetadata.format,
        width: imageMetadata.width,
        height: imageMetadata.height,
        space: imageMetadata.space,
        channels: imageMetadata.channels,
        depth: imageMetadata.depth,
        density: imageMetadata.density,
        hasAlpha: imageMetadata.hasAlpha,
        orientation: imageMetadata.orientation,
      };

      // Extract EXIF data if available
      if (imageMetadata.exif) {
        try {
          const exifData = ExifReader(imageMetadata.exif);
          metadata.exif = this.cleanExifData(exifData);
        } catch (error) {
          this.logger.warn('Error parsing EXIF data:', error);
        }
      }

      return metadata;
    } catch (error: any) {
      this.logger.error('Error extracting image metadata:', error.message);
      return {};
    }
  }

  /**
   * Parse PDF date format
   */
  private parsePdfDate(pdfDate: string): string | null {
    try {
      // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
      const match = pdfDate.match(
        /D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
      );
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          `${year}-${month}-${day}T${hour}:${minute}:${second}`,
        ).toISOString();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean and normalize EXIF data
   */
  private cleanExifData(exifData: any): any {
    const cleaned: any = {};

    if (exifData.image) {
      if (exifData.image.Make) cleaned.cameraMake = exifData.image.Make;
      if (exifData.image.Model) cleaned.cameraModel = exifData.image.Model;
      if (exifData.image.Software) cleaned.software = exifData.image.Software;
      if (exifData.image.DateTime) cleaned.dateTime = exifData.image.DateTime;
    }

    if (exifData.exif) {
      if (exifData.exif.DateTimeOriginal)
        cleaned.dateTimeOriginal = exifData.exif.DateTimeOriginal;
      if (exifData.exif.DateTimeDigitized)
        cleaned.dateTimeDigitized = exifData.exif.DateTimeDigitized;
      if (exifData.exif.ExposureTime)
        cleaned.exposureTime = exifData.exif.ExposureTime;
      if (exifData.exif.FNumber) cleaned.fNumber = exifData.exif.FNumber;
      if (exifData.exif.ISO) cleaned.iso = exifData.exif.ISO;
      if (exifData.exif.FocalLength)
        cleaned.focalLength = exifData.exif.FocalLength;
    }

    if (exifData.gps) {
      cleaned.gps = {
        latitude: exifData.gps.GPSLatitude,
        longitude: exifData.gps.GPSLongitude,
        altitude: exifData.gps.GPSAltitude,
      };
    }

    return cleaned;
  }
}
