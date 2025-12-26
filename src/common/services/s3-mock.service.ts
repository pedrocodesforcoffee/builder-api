import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Mock S3 Service for Local Development
 *
 * This service provides a local file system implementation of S3 operations
 * for development environments where AWS S3 is not available.
 *
 * Files are stored in: /tmp/builder-s3-mock/{bucket-name}/{key}
 */
@Injectable()
export class S3MockService {
  private readonly logger = new Logger(S3MockService.name);
  private readonly basePath = '/tmp/builder-s3-mock';

  constructor() {
    this.logger.warn('Using MOCK S3 Service - for development only!');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      this.logger.log(`Mock S3 storage initialized at: ${this.basePath}`);
    } catch (error) {
      this.logger.error('Failed to initialize mock S3 storage', error);
    }
  }

  /**
   * Get quarantine bucket name
   */
  getQuarantineBucket(): string {
    return 'builder-uploads-quarantine-dev';
  }

  /**
   * Get production bucket name
   */
  getProductionBucket(): string {
    return 'builder-documents-dev';
  }

  /**
   * Generate a presigned URL for upload
   * In mock mode, returns a local file path
   */
  async generatePresignedUploadUrl(
    key: string,
    bucket: string,
    contentType?: string,
  ): Promise<string> {
    const filePath = join(this.basePath, bucket, key);
    await fs.mkdir(join(this.basePath, bucket), { recursive: true });

    // Return a mock URL that includes the file path
    const mockUrl = `mock-s3://${bucket}/${key}?path=${encodeURIComponent(filePath)}`;

    this.logger.debug(`Generated mock presigned URL: ${mockUrl}`);
    return mockUrl;
  }

  /**
   * Generate multipart upload URLs
   */
  async generateMultipartUploadUrls(
    key: string,
    bucket: string,
    partCount: number,
    contentType?: string,
  ): Promise<{
    uploadId: string;
    urls: string[];
    partSize: number;
  }> {
    const uploadId = randomUUID();
    const urls: string[] = [];
    const partSize = 10 * 1024 * 1024; // 10MB

    const basePath = join(this.basePath, bucket, key);
    await fs.mkdir(join(this.basePath, bucket), { recursive: true });

    for (let i = 0; i < partCount; i++) {
      const partPath = `${basePath}.part${i + 1}`;
      urls.push(
        `mock-s3://${bucket}/${key}.part${i + 1}?uploadId=${uploadId}&partNumber=${i + 1}&path=${encodeURIComponent(partPath)}`,
      );
    }

    this.logger.debug(
      `Generated ${partCount} multipart upload URLs for uploadId: ${uploadId}`,
    );

    return { uploadId, urls, partSize };
  }

  /**
   * Get an object from storage
   */
  async getObject(key: string, bucket: string): Promise<Buffer> {
    const filePath = join(this.basePath, bucket, key);

    try {
      const buffer = await fs.readFile(filePath);
      this.logger.debug(`Retrieved object: ${key} from bucket: ${bucket}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to retrieve object: ${key}`, error);
      throw new Error(`File not found: ${key}`);
    }
  }

  /**
   * Delete an object from storage
   */
  async deleteObject(key: string, bucket: string): Promise<void> {
    const filePath = join(this.basePath, bucket, key);

    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted object: ${key} from bucket: ${bucket}`);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete object: ${key}`, error);
        throw error;
      }
    }
  }

  /**
   * Copy an object within the same storage or between buckets
   */
  async copyObject(
    sourceKey: string,
    sourceBucket: string,
    destKey: string,
    destBucket: string,
  ): Promise<void> {
    const sourcePath = join(this.basePath, sourceBucket, sourceKey);
    const destPath = join(this.basePath, destBucket, destKey);

    try {
      await fs.mkdir(join(this.basePath, destBucket), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      this.logger.debug(
        `Copied object from ${sourceBucket}/${sourceKey} to ${destBucket}/${destKey}`,
      );
    } catch (error) {
      this.logger.error(`Failed to copy object: ${sourceKey}`, error);
      throw error;
    }
  }

  /**
   * Move file from quarantine to production bucket
   */
  async moveFromQuarantineToProduction(key: string): Promise<void> {
    const sourceBucket = this.getQuarantineBucket();
    const destBucket = this.getProductionBucket();

    await this.copyObject(key, sourceBucket, key, destBucket);
    await this.deleteObject(key, sourceBucket);

    this.logger.log(`Moved file from quarantine to production: ${key}`);
  }

  /**
   * Check if an object exists
   */
  async objectExists(key: string, bucket: string): Promise<boolean> {
    const filePath = join(this.basePath, bucket, key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata
   */
  async getObjectMetadata(key: string, bucket: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
  }> {
    const filePath = join(this.basePath, bucket, key);

    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        contentType: 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for: ${key}`, error);
      throw new Error(`File not found: ${key}`);
    }
  }

  /**
   * Save uploaded file (for handling mock uploads)
   */
  async saveUploadedFile(
    key: string,
    bucket: string,
    buffer: Buffer,
  ): Promise<void> {
    const filePath = join(this.basePath, bucket, key);

    try {
      await fs.mkdir(join(this.basePath, bucket), { recursive: true });
      await fs.writeFile(filePath, buffer);
      this.logger.debug(`Saved uploaded file: ${key} to bucket: ${bucket}`);
    } catch (error) {
      this.logger.error(`Failed to save uploaded file: ${key}`, error);
      throw error;
    }
  }

  /**
   * List objects in a bucket (useful for testing)
   */
  async listObjects(bucket: string, prefix?: string): Promise<string[]> {
    const bucketPath = join(this.basePath, bucket);

    try {
      const files = await fs.readdir(bucketPath, { recursive: true });
      let filteredFiles = files.filter((f) => !f.includes('.part'));

      if (prefix) {
        filteredFiles = filteredFiles.filter((f) => f.startsWith(prefix));
      }

      return filteredFiles;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear all mock data (useful for testing)
   */
  async clearAll(): Promise<void> {
    try {
      await fs.rm(this.basePath, { recursive: true, force: true });
      await fs.mkdir(this.basePath, { recursive: true });
      this.logger.warn('Cleared all mock S3 data');
    } catch (error) {
      this.logger.error('Failed to clear mock S3 data', error);
    }
  }
}
