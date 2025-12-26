import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Document Version Entity
 *
 * Tracks each version/revision of a document with complete file metadata.
 * Supports full version history, checksums for integrity, and processing status.
 *
 * Features:
 * - Sequential version numbering
 * - Display labels for user-friendly versioning
 * - Complete file metadata (size, mime type, S3 location)
 * - File integrity checksums (MD5, SHA256)
 * - Processing status (thumbnail, OCR, virus scan)
 * - Change descriptions per version
 * - Source tracking for imports/copies
 *
 * @entity document_versions
 */
@Entity('document_versions')
@Index('IDX_document_versions_document_number', ['documentId', 'versionNumber'], {
  unique: true,
})
@Index('IDX_document_versions_document_latest', ['documentId', 'isLatest'])
@Index('IDX_document_versions_uploaded_by', ['uploadedById'])
@Index('IDX_document_versions_uploaded_at', ['uploadedAt'])
@Index('IDX_document_versions_checksum_md5', ['checksumMD5'])
@Index('IDX_document_versions_checksum_sha256', ['checksumSHA256'])
export class DocumentVersion {
  /**
   * Unique identifier for the version (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== PARENT DOCUMENT ====================

  /**
   * Parent document ID
   */
  @Column('uuid')
  documentId!: string;

  /**
   * Parent document relation
   */
  @ManyToOne(() => Document, (document) => document.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  // ==================== VERSION IDENTITY ====================

  /**
   * Sequential version number (1, 2, 3...)
   * Auto-incremented within document
   */
  @Column({ type: 'int' })
  versionNumber!: number;

  /**
   * Display label for version (e.g., "1.0", "1.1", "2.0", "Rev A")
   * Can be different from versionNumber for user-friendly display
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  versionLabel!: string | null;

  /**
   * Whether this is the latest/current version
   * Only one version per document should have isLatest = true
   */
  @Column({ default: false })
  isLatest!: boolean;

  // ==================== FILE INFORMATION ====================

  /**
   * File name as stored in S3
   * Usually includes UUID to avoid collisions
   */
  @Column({ type: 'varchar', length: 500 })
  fileName!: string;

  /**
   * Original file name as uploaded by user
   */
  @Column({ type: 'varchar', length: 255 })
  originalFileName!: string;

  /**
   * File size in bytes
   */
  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
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
   * S3 bucket name (can vary by environment/purpose)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Bucket!: string | null;

  // ==================== FILE INTEGRITY ====================

  /**
   * MD5 checksum for file integrity verification
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  checksumMD5!: string | null;

  /**
   * SHA256 checksum for enhanced file integrity
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  checksumSHA256!: string | null;

  // ==================== PROCESSING STATUS ====================

  /**
   * Whether thumbnail has been generated
   */
  @Column({ default: false })
  thumbnailGenerated!: boolean;

  /**
   * S3 key for thumbnail image
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  thumbnailS3Key!: string | null;

  /**
   * Whether OCR text extraction has been performed
   */
  @Column({ default: false })
  ocrProcessed!: boolean;

  /**
   * Extracted text from OCR for full-text search
   */
  @Column({ type: 'text', nullable: true })
  ocrText!: string | null;

  /**
   * Extracted text (alias for ocrText for backwards compatibility)
   */
  @Column({ type: 'text', nullable: true })
  extractedText!: string | null;

  /**
   * Searchable text (normalized version of extracted text)
   */
  @Column({ type: 'text', nullable: true })
  searchableText!: string | null;

  /**
   * General metadata for the version
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  /**
   * Whether virus scan passed
   */
  @Column({ default: false })
  virusScanPassed!: boolean;

  /**
   * When virus scan was performed
   */
  @Column({ type: 'timestamp', nullable: true })
  virusScannedAt!: Date | null;

  // ==================== VERSION METADATA ====================

  /**
   * Description of what changed in this version
   */
  @Column({ type: 'text', nullable: true })
  changeDescription!: string | null;

  /**
   * File-specific metadata (EXIF data, PDF properties, etc.)
   */
  @Column({ type: 'jsonb', default: {} })
  fileMetadata!: Record<string, any>;

  // ==================== UPLOAD INFORMATION ====================

  /**
   * User who uploaded this version
   */
  @Column('uuid')
  uploadedById!: string;

  /**
   * Uploaded by user relation
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;

  /**
   * When this version was uploaded
   */
  @CreateDateColumn()
  uploadedAt!: Date;

  // ==================== SOURCE TRACKING ====================

  /**
   * Source type for this version
   * - 'upload': Direct user upload
   * - 'copy': Copied from another document
   * - 'import': Imported from external system
   * - 'scan': Scanned document
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceType!: string | null;

  /**
   * If copied, the source version ID
   */
  @Column('uuid', { nullable: true })
  sourceVersionId!: string | null;
}
