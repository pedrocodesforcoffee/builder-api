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
const Tesseract = require('tesseract.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

interface OcrJobData {
  uploadId: string;
}

@Processor(QUEUE_NAMES.DOCUMENT_PROCESSING)
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    @InjectRepository(DocumentVersion)
    private versionRepository: Repository<DocumentVersion>,
    private s3Service: S3Service,
  ) {}

  @Process(JOB_NAMES.EXTRACT_TEXT_OCR)
  async handleOcr(job: Job<OcrJobData>): Promise<void> {
    const { uploadId } = job.data;

    this.logger.log(`Starting OCR extraction for upload: ${uploadId}`);

    try {
      // Get upload record
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
        relations: ['version'],
      });

      if (!upload) {
        throw new Error(`Upload not found: ${uploadId}`);
      }

      // Update processing status
      upload.processingStatus = {
        ...upload.processingStatus,
        ocr: {
          status: 'processing',
          startedAt: new Date().toISOString(),
        },
      };
      await this.uploadRepository.save(upload);

      // Check if file type supports OCR
      if (!this.supportsOcr(upload.mimeType)) {
        this.logger.log(
          `File type ${upload.mimeType} does not support OCR, skipping`,
        );
        upload.processingStatus = {
          ...upload.processingStatus,
          ocr: {
            status: 'skipped',
            completedAt: new Date().toISOString(),
            message: 'File type does not support OCR',
          },
        };
        await this.uploadRepository.save(upload);
        return;
      }

      // Download file from S3
      const fileBuffer = await this.s3Service.getObject(upload.s3Key);

      let extractedText = '';

      // Extract text based on MIME type
      if (upload.mimeType === 'application/pdf') {
        extractedText = await this.extractTextFromPdf(fileBuffer);
      } else if (upload.mimeType.startsWith('image/')) {
        extractedText = await this.extractTextFromImage(fileBuffer);
      }

      // Update version with extracted text
      if (upload.versionId && extractedText) {
        const version = await this.versionRepository.findOne({
          where: { id: upload.versionId },
        });

        if (version) {
          version.extractedText = extractedText;
          version.searchableText = this.cleanTextForSearch(extractedText);
          await this.versionRepository.save(version);

          this.logger.log(
            `Extracted ${extractedText.length} characters of text for upload: ${uploadId}`,
          );
        }
      }

      // Update upload with OCR results
      upload.processingStatus = {
        ...upload.processingStatus,
        ocr: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          textLength: extractedText.length,
          language: 'eng',
        },
      };
      await this.uploadRepository.save(upload);

      this.logger.log(`OCR extraction completed successfully for: ${uploadId}`);
    } catch (error: any) {
      this.logger.error(
        `Error extracting text for upload ${uploadId}:`,
        error.stack,
      );

      // Update upload with error
      const upload = await this.uploadRepository.findOne({
        where: { id: uploadId },
      });

      if (upload) {
        upload.processingStatus = {
          ...upload.processingStatus,
          ocr: {
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
   * Check if MIME type supports OCR
   */
  private supportsOcr(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
    ];
    return supportedTypes.includes(mimeType);
  }

  /**
   * Extract text from PDF
   */
  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error: any) {
      this.logger.error('Error extracting text from PDF:', error.message);
      return '';
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
      const result = await Tesseract.recognize(buffer, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return result.data.text;
    } catch (error: any) {
      this.logger.error('Error extracting text from image:', error.message);
      return '';
    }
  }

  /**
   * Clean and normalize text for search
   */
  private cleanTextForSearch(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s]/gi, ' ') // Remove special characters
      .toLowerCase()
      .trim();
  }
}
