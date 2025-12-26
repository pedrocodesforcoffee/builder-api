import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Submittal } from './submittal.entity';

/**
 * Document Purpose Enum
 *
 * Indicates why document is included in submittal
 */
export enum DocumentPurpose {
  PRIMARY = 'primary', // Main submittal document
  SUPPORTING = 'supporting', // Supporting documentation
  REFERENCE = 'reference', // Reference material
  COVER_SHEET = 'cover_sheet', // Submittal cover sheet
  RESPONSE = 'response', // Response from reviewer
  STAMPED = 'stamped', // Architect-stamped version
}

/**
 * SubmittalDocument Entity
 *
 * Junction entity linking submittals to documents.
 * Tracks which documents are included in each submittal package.
 *
 * Features:
 * - Many-to-many relationship between submittals and documents
 * - Document versioning support
 * - Purpose classification
 * - Ordering for display
 * - Page count tracking
 */
@Entity('submittal_documents')
@Index(['submittalId', 'documentId'])
@Index(['submittalId', 'displayOrder'])
export class SubmittalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal!: Submittal;

  @Column('uuid')
  documentId!: string;

  // Note: Document relationship would be defined here if importing from documents module
  // For now, storing documentId as string to avoid circular dependencies

  @Column('uuid', { nullable: true })
  documentVersionId!: string | null; // Specific version of document

  // ==================== Document Info ====================

  @Column('varchar', { length: 200 })
  documentName!: string; // Cached from document for performance

  @Column('varchar', { length: 100, nullable: true })
  documentNumber!: string | null; // Drawing/spec number

  @Column({ type: 'varchar', length: 50 })
  purpose!: DocumentPurpose;

  @Column('int', { default: 0 })
  displayOrder!: number; // Order in submittal package

  // ==================== Metadata ====================

  @Column('int', { nullable: true })
  pageCount!: number | null;

  @Column('bigint', { nullable: true })
  fileSize!: number | null; // In bytes

  @Column('varchar', { length: 100, nullable: true })
  mimeType!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null; // Notes about this specific document in submittal

  @Column('boolean', { default: false })
  isRequired!: boolean; // If this document is mandatory

  @Column('boolean', { default: false })
  isReviewCopy!: boolean; // If this is a review copy (vs. final)

  // ==================== Status ====================

  @Column('boolean', { default: false })
  isApproved!: boolean; // If reviewer approved this specific doc

  @Column('boolean', { default: false })
  hasMarkups!: boolean; // If reviewer added markups

  @Column('varchar', { length: 255, nullable: true })
  markupDocumentId!: string | null; // ID of document with reviewer markups

  // ==================== Attachement Info ====================

  @Column('varchar', { length: 255, nullable: true })
  s3Key!: string | null; // S3 key for document file

  @Column('varchar', { length: 500, nullable: true })
  s3Url!: string | null; // Pre-signed URL (temporary)

  @Column('varchar', { length: 64, nullable: true })
  checksum!: string | null; // SHA-256 checksum for integrity

  // ==================== Timestamps ====================

  @CreateDateColumn()
  attachedAt!: Date;

  @Column('uuid')
  attachedBy!: string; // User who attached document

  @Column('varchar', { length: 100 })
  attachedByName!: string;

  @Column('timestamp', { nullable: true })
  reviewedAt!: Date | null; // When this document was reviewed

  @Column('uuid', { nullable: true })
  reviewedBy!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  reviewedByName!: string | null;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    originalFilename?: string;
    uploadedFrom?: string; // 'direct' | 'document_library' | 'transmittal'
    linkedTransmittalId?: string;
    extractedText?: string; // OCR text
    thumbnailUrl?: string;
    [key: string]: any;
  } | null;
}
