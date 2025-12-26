import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentType, DocumentStatus } from '../enums';

/**
 * Document Entity
 *
 * Core document record representing any uploaded file in the system.
 * Supports full version control, locking, soft delete, and comprehensive audit trails.
 *
 * Features:
 * - Multiple document types (drawings, specs, RFIs, submittals, etc.)
 * - Full version history with current version tracking
 * - Document locking for exclusive editing
 * - Soft delete with recovery capability
 * - Flexible metadata and tagging
 * - Complete audit trail
 *
 * @entity documents
 */
@Entity('documents')
@Index('IDX_documents_project', ['projectId'])
@Index('IDX_documents_project_folder', ['projectId', 'folderId'])
@Index('IDX_documents_project_type', ['projectId', 'documentType'])
@Index('IDX_documents_project_status', ['projectId', 'status'])
@Index('IDX_documents_project_number', ['projectId', 'number'], {
  unique: true,
  where: '"deletedAt" IS NULL AND "number" IS NOT NULL',
})
@Index('IDX_documents_project_name', ['projectId', 'name'])
@Index('IDX_documents_locked_by', ['lockedById'])
@Index('IDX_documents_created_at', ['createdAt'])
export class Document {
  /**
   * Unique identifier for the document (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== RELATIONSHIPS ====================

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
   * Parent folder ID (optional - for future folder hierarchy)
   * Note: Folder entity to be created separately
   */
  @Column('uuid', { nullable: true })
  folderId!: string | null;

  // ==================== DOCUMENT IDENTITY ====================

  /**
   * Document name/title
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * User-defined document number (e.g., "DOC-001", "RFI-042")
   * Must be unique within project
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  number!: string | null;

  /**
   * Current revision marker (e.g., "A", "1", "Rev 2")
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  revision!: string | null;

  /**
   * Document type classification
   */
  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  documentType!: DocumentType;

  /**
   * Document lifecycle status
   */
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status!: DocumentStatus;

  /**
   * Document description
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ==================== VERSION TRACKING ====================

  /**
   * Current/latest version ID
   */
  @Column('uuid', { nullable: true })
  currentVersionId!: string | null;

  /**
   * Current version relation
   * Circular dependency resolved by string reference
   */
  @OneToOne('DocumentVersion', { nullable: true })
  @JoinColumn({ name: 'currentVersionId' })
  currentVersion!: any; // DocumentVersion

  /**
   * All versions of this document
   */
  @OneToMany('DocumentVersion', 'document')
  versions!: any[]; // DocumentVersion[]

  // ==================== LOCKING ====================

  /**
   * Whether document is locked for editing
   */
  @Column({ default: false })
  isLocked!: boolean;

  /**
   * User who locked the document
   */
  @Column('uuid', { nullable: true })
  lockedById!: string | null;

  /**
   * User relation for lock
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lockedById' })
  lockedBy!: User | null;

  /**
   * When document was locked
   */
  @Column({ type: 'timestamp', nullable: true })
  lockedAt!: Date | null;

  /**
   * Auto-unlock after this time
   */
  @Column({ type: 'timestamp', nullable: true })
  lockExpiresAt!: Date | null;

  // ==================== METADATA ====================

  /**
   * Flexible JSON metadata storage
   * Can store document-type-specific fields
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  /**
   * Document tags for categorization/search
   */
  @Column('simple-array', { default: '' })
  tags!: string[];

  // ==================== AUDIT FIELDS ====================

  /**
   * User who created the document
   */
  @Column('uuid')
  createdById!: string;

  /**
   * Created by user relation
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  /**
   * User who last updated the document
   */
  @Column('uuid', { nullable: true })
  updatedById!: string | null;

  /**
   * Updated by user relation
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy!: User | null;

  /**
   * When document was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * When document was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Soft delete timestamp
   * When set, document is "deleted" but recoverable
   */
  @DeleteDateColumn()
  deletedAt!: Date | null;

  /**
   * User who deleted the document
   */
  @Column('uuid', { nullable: true })
  deletedById!: string | null;

  /**
   * Deleted by user relation
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deletedById' })
  deletedBy!: User | null;
}
