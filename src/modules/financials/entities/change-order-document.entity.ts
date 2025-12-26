import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CoDocumentType } from '../enums/co-document-type.enum';

/**
 * ChangeOrderDocument Entity
 *
 * Manages document attachments for Owner Change Orders (OCO) and
 * Commitment Change Orders (CCO).
 *
 * Features:
 * - Polymorphic reference to OCO or CCO via changeOrderId + changeOrderType
 * - Document type categorization (proposal, backup, T&M, sketch, photo, etc.)
 * - Full file metadata (name, URL, size, MIME type)
 * - User attribution (who uploaded)
 * - Timestamped upload tracking
 *
 * Document Types:
 * - PROPOSAL: Contractor/subcontractor proposals
 * - BACKUP: Cost documentation, quotes, estimates
 * - T_AND_M: Time and materials records
 * - SKETCH: Technical drawings
 * - PHOTO: Site condition photos
 * - CORRESPONDENCE: Email, letters
 * - APPROVAL: Signed approvals
 * - OTHER: Miscellaneous
 *
 * Use Cases:
 * - Change order justification
 * - Audit compliance
 * - Cost verification
 * - Contract documentation
 *
 * @entity change_order_documents
 */
@Entity('change_order_documents')
@Index('IDX_co_doc_change_order', ['changeOrderId', 'changeOrderType'])
@Index('IDX_co_doc_type', ['documentType'])
@Index('IDX_co_doc_uploaded_by', ['uploadedBy'])
@Index('IDX_co_doc_uploaded_at', ['uploadedAt'])
@Index('IDX_co_doc_composite', ['changeOrderId', 'changeOrderType', 'documentType'])
export class ChangeOrderDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== CHANGE ORDER REFERENCE ====================

  @Column({ type: 'uuid', name: 'change_order_id', nullable: false })
  changeOrderId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'change_order_type',
    nullable: false,
  })
  changeOrderType!: 'OCO' | 'CCO';

  // ==================== DOCUMENT CLASSIFICATION ====================

  @Column({
    type: 'varchar',
    length: 50,
    name: 'document_type',
    nullable: false,
  })
  documentType!: CoDocumentType;

  // ==================== FILE INFORMATION ====================

  @Column({
    type: 'varchar',
    length: 255,
    name: 'file_name',
    nullable: false,
  })
  fileName!: string;

  @Column({
    type: 'text',
    name: 'file_url',
    nullable: false,
  })
  fileUrl!: string;

  @Column({
    type: 'bigint',
    name: 'file_size',
    nullable: false,
    comment: 'File size in bytes',
  })
  fileSize!: number;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'mime_type',
    nullable: false,
  })
  mimeType!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== AUDIT ====================

  @Column({ type: 'uuid', name: 'uploaded_by', nullable: false })
  uploadedBy!: string;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamp with time zone' })
  uploadedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser!: User;
}
