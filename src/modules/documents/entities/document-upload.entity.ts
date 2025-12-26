import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { DocumentVersion } from './document-version.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Document Upload Entity
 *
 * Tracks document uploads through their entire lifecycle from initiation to completion.
 * Supports both single and multipart uploads with comprehensive processing status tracking.
 *
 * Features:
 * - Single and multipart upload tracking
 * - Pre-signed URL management
 * - Processing pipeline status (virus scan, thumbnail, OCR, metadata)
 * - Upload expiry and cleanup
 * - Error tracking and recovery
 *
 * @entity document_uploads
 */

export enum UploadStatus {
  INITIATED = 'initiated',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded', // In S3, pending processing
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

export enum UploadType {
  SINGLE = 'single',
  MULTIPART = 'multipart',
}

@Entity('document_uploads')
@Index('IDX_document_uploads_project_status', ['projectId', 'status'])
@Index('IDX_document_uploads_uploaded_by_status', ['uploadedById', 'status'])
@Index('IDX_document_uploads_status_expires', ['status', 'expiresAt'])
@Index('IDX_document_uploads_s3_upload_id', ['s3UploadId'])
@Index('IDX_document_uploads_document', ['documentId'])
export class DocumentUpload {
  /**
   * Unique identifier for the upload (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== CONTEXT ====================

  /**
   * Parent project ID
   */
  @Column('uuid')
  projectId!: string;

  /**
   * Parent project relation
   */
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  /**
   * Target folder ID (optional)
   */
  @Column('uuid', { nullable: true })
  folderId!: string | null;

  // ==================== UPLOAD STATE ====================

  /**
   * Upload lifecycle status
   */
  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.INITIATED,
  })
  status!: UploadStatus;

  /**
   * Upload type (single or multipart)
   */
  @Column({
    type: 'enum',
    enum: UploadType,
  })
  uploadType!: UploadType;

  // ==================== FILE INFORMATION ====================

  /**
   * Original file name as uploaded by user
   */
  @Column({ type: 'varchar', length: 500 })
  originalFileName!: string;

  /**
   * File size in bytes
   */
  @Column({ type: 'bigint' })
  fileSize!: number;

  /**
   * MIME type (e.g., "application/pdf", "image/jpeg")
   */
  @Column({ type: 'varchar', length: 255 })
  mimeType!: string;

  /**
   * S3 object key/path
   */
  @Column({ type: 'varchar', length: 1000 })
  s3Key!: string;

  /**
   * S3 bucket name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Bucket!: string | null;

  // ==================== MULTIPART SPECIFIC ====================

  /**
   * S3's multipart upload ID
   * Set only for multipart uploads
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  s3UploadId!: string | null;

  /**
   * Total number of parts for multipart upload
   */
  @Column({ type: 'int', nullable: true })
  totalParts!: number | null;

  /**
   * Completed parts with their ETags
   * Tracks which parts have been uploaded
   */
  @Column({ type: 'jsonb', default: [] })
  completedParts!: Array<{
    partNumber: number;
    etag: string;
    size: number;
  }>;

  // ==================== DOCUMENT ASSOCIATION ====================

  /**
   * Associated document ID (set after completion)
   */
  @Column('uuid', { nullable: true })
  documentId!: string | null;

  /**
   * Associated document relation
   */
  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'documentId' })
  document!: Document | null;

  /**
   * Associated version ID (set after completion)
   */
  @Column('uuid', { nullable: true })
  versionId!: string | null;

  /**
   * Associated version relation
   */
  @ManyToOne(() => DocumentVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'versionId' })
  version!: DocumentVersion | null;

  // ==================== PROCESSING STATUS ====================

  /**
   * Processing pipeline status
   * Tracks virus scan, thumbnail, OCR, metadata extraction
   */
  @Column({ type: 'jsonb', default: {} })
  processingStatus!: {
    virusScan?: {
      status: string;
      startedAt?: string;
      completedAt?: string;
      scannedAt?: string;
      threat?: string;
      message?: string;
      error?: string;
      viruses?: string[];
      clean?: boolean;
    };
    thumbnail?: {
      status: string;
      startedAt?: string;
      completedAt?: string;
      s3Key?: string;
      generatedAt?: string;
      message?: string;
      error?: string;
      urls?: Record<string, string>;
    };
    thumbnails?: {
      status: string;
      startedAt?: string;
      completedAt?: string;
      s3Key?: string;
      generatedAt?: string;
      message?: string;
      error?: string;
      urls?: Record<string, string>;
    };
    ocr?: {
      status: string;
      startedAt?: string;
      completedAt?: string;
      textLength?: number;
      processedAt?: string;
      language?: string;
      message?: string;
      error?: string;
    };
    metadata?: {
      status: string;
      startedAt?: string;
      completedAt?: string;
      extracted?: Record<string, any>;
      fieldsExtracted?: number;
      message?: string;
      error?: string;
    };
    checksum?: {
      md5?: string;
      sha256?: string;
    };
  };

  // ==================== INITIAL METADATA ====================

  /**
   * Metadata provided in the upload request
   * Used when creating the document
   */
  @Column({ type: 'jsonb', default: {} })
  requestedMetadata!: {
    documentType?: string;
    description?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };

  // ==================== ERROR TRACKING ====================

  /**
   * Error message if upload or processing failed
   */
  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  /**
   * Error code for programmatic handling
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  // ==================== OWNERSHIP ====================

  /**
   * User who initiated the upload
   */
  @Column('uuid')
  uploadedById!: string;

  /**
   * Upload owner relation
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;

  // ==================== TIMESTAMPS ====================

  /**
   * When upload was initiated
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * When upload record was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * When upload was completed (file in S3 and document created)
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  /**
   * When incomplete uploads should be cleaned up
   * Typically 24 hours after initiation
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;
}
