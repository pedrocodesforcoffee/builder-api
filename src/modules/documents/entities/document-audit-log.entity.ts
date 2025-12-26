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
import { DocumentVersion } from './document-version.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentAuditAction } from '../enums';

/**
 * Document Audit Log Entity
 *
 * Comprehensive audit trail for all document operations.
 * Tracks who did what, when, and what changed for compliance and transparency.
 *
 * Features:
 * - Complete action tracking (create, update, delete, download, etc.)
 * - Change tracking (before/after values)
 * - User and context information
 * - Request metadata (IP, user agent, session)
 * - Immutable log entries
 *
 * @entity document_audit_logs
 */
@Entity('document_audit_logs')
@Index('IDX_document_audit_logs_document', ['documentId', 'performedAt'])
@Index('IDX_document_audit_logs_project', ['projectId', 'performedAt'])
@Index('IDX_document_audit_logs_user', ['performedById', 'performedAt'])
@Index('IDX_document_audit_logs_action', ['action', 'performedAt'])
@Index('IDX_document_audit_logs_performed_at', ['performedAt'])
export class DocumentAuditLog {
  /**
   * Unique identifier for the audit log entry (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== WHAT WAS AFFECTED ====================

  /**
   * Document that was affected
   */
  @Column('uuid')
  documentId!: string;

  /**
   * Document relation
   */
  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  /**
   * Specific version affected (if action was version-related)
   */
  @Column('uuid', { nullable: true })
  versionId!: string | null;

  /**
   * Version relation
   */
  @ManyToOne(() => DocumentVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'versionId' })
  version!: DocumentVersion | null;

  // ==================== CONTEXT ====================

  /**
   * Project ID (denormalized for efficient queries)
   */
  @Column('uuid')
  projectId!: string;

  /**
   * Folder ID (if applicable)
   */
  @Column('uuid', { nullable: true })
  folderId!: string | null;

  // ==================== ACTION DETAILS ====================

  /**
   * Type of action performed
   */
  @Column({
    type: 'enum',
    enum: DocumentAuditAction,
  })
  action!: DocumentAuditAction;

  /**
   * Human-readable description of the action
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ==================== CHANGE TRACKING ====================

  /**
   * Values before the change
   * Only stores fields that changed, not entire entity
   */
  @Column({ type: 'jsonb', nullable: true })
  previousValues!: Record<string, any> | null;

  /**
   * Values after the change
   * Only stores fields that changed
   */
  @Column({ type: 'jsonb', nullable: true })
  newValues!: Record<string, any> | null;

  // ==================== ACTOR ====================

  /**
   * User who performed the action
   */
  @Column('uuid')
  performedById!: string;

  /**
   * User relation
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedById' })
  performedBy!: User;

  /**
   * When the action was performed
   */
  @CreateDateColumn()
  performedAt!: Date;

  // ==================== REQUEST CONTEXT ====================

  /**
   * IP address of the request
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  /**
   * User agent string
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  /**
   * Session ID for tracking related actions
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId!: string | null;
}
