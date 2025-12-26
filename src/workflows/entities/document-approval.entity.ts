import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApprovalChain } from './approval-chain.entity';

/**
 * Approval Status Enum
 *
 * Status of individual document approval
 */
export enum ApprovalStatus {
  PENDING = 'pending', // Awaiting approval
  IN_REVIEW = 'in_review', // Under review
  APPROVED = 'approved', // Approved
  REJECTED = 'rejected', // Rejected
  CONDITIONALLY_APPROVED = 'conditionally_approved', // Approved with conditions
  WITHDRAWN = 'withdrawn', // Withdrawn by submitter
  SUPERSEDED = 'superseded', // Replaced by newer version
}

/**
 * DocumentApproval Entity
 *
 * Tracks approval status of individual documents within an approval chain.
 * Multiple documents can be part of the same approval chain.
 *
 * Features:
 * - Document-level approval tracking
 * - Version-specific approvals
 * - Conditions and notes
 * - Digital signatures
 * - Expiration dates
 */
@Entity('document_approvals')
@Index(['approvalChainId', 'documentId'])
@Index(['documentId', 'status'])
@Index(['approverId', 'status'])
@Index(['status', 'expiresAt'])
export class DocumentApproval {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  @Index()
  approvalChainId!: string;

  @ManyToOne(() => ApprovalChain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approvalChainId' })
  approvalChain!: ApprovalChain;

  @Column('uuid')
  @Index()
  documentId!: string;

  @Column('uuid', { nullable: true })
  documentVersionId!: string | null; // Specific version

  // ==================== Document Info ====================

  @Column('varchar', { length: 200 })
  documentName!: string;

  @Column('varchar', { length: 100, nullable: true })
  documentNumber!: string | null; // Drawing/spec number

  @Column('varchar', { length: 50, nullable: true })
  documentType!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  versionNumber!: string | null;

  // ==================== Approval Status ====================

  @Column({ type: 'varchar', length: 50, default: ApprovalStatus.PENDING })
  @Index()
  status!: ApprovalStatus;

  @Column('uuid', { nullable: true })
  @Index()
  approverId!: string | null; // Current or final approver

  @Column('varchar', { length: 100, nullable: true })
  approverName!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  approverEmail!: string | null;

  @Column('int', { nullable: true })
  approvalStepNumber!: number | null; // Which step in chain

  // ==================== Approval Details ====================

  @Column('text', { nullable: true })
  approvalComments!: string | null;

  @Column('text', { nullable: true })
  conditions!: string | null; // Conditions for conditional approval

  @Column('text', { nullable: true })
  rejectionReason!: string | null;

  @Column('simple-array', { nullable: true })
  requiredChanges!: string[] | null; // List of required changes

  // ==================== Timing ====================

  @Column('timestamp', { nullable: true })
  requestedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  reviewStartedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  approvedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  rejectedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  expiresAt!: Date | null; // Approval expiration

  @Column('timestamp', { nullable: true })
  dueDate!: Date | null;

  @Column('boolean', { default: false })
  isOverdue!: boolean;

  @Column('boolean', { default: false })
  isExpired!: boolean;

  // ==================== Digital Signature ====================

  @Column('boolean', { default: false })
  requiresSignature!: boolean;

  @Column('boolean', { default: false })
  isSigned!: boolean;

  @Column('jsonb', { nullable: true })
  signature!: {
    signedBy: string;
    signedAt: Date;
    signature: string; // Cryptographic signature
    certificateId?: string;
    timestamp?: string; // Trusted timestamp
    ipAddress?: string;
    userAgent?: string;
  } | null;

  // ==================== Stamped Document ====================

  @Column('varchar', { length: 255, nullable: true })
  stampedDocumentId!: string | null; // Approved/stamped version

  @Column('varchar', { length: 500, nullable: true })
  stampedDocumentUrl!: string | null; // S3 URL

  @Column('timestamp', { nullable: true })
  stampedAt!: Date | null;

  @Column('uuid', { nullable: true })
  stampedBy!: string | null;

  // ==================== Attachments ====================

  @Column('simple-array', { nullable: true })
  attachmentIds!: string[] | null; // Supporting documents

  @Column('simple-array', { nullable: true })
  markupIds!: string[] | null; // Reviewer markups

  // ==================== Notification ====================

  @Column('int', { default: 0 })
  remindersSent!: number;

  @Column('timestamp', { nullable: true })
  lastReminderSentAt!: Date | null;

  @Column('boolean', { default: false })
  notificationSent!: boolean;

  // ==================== Delegation ====================

  @Column('boolean', { default: false })
  isDelegated!: boolean;

  @Column('uuid', { nullable: true })
  delegatedFrom!: string | null; // Original approver

  @Column('uuid', { nullable: true })
  delegatedTo!: string | null; // Delegate

  @Column('timestamp', { nullable: true })
  delegatedAt!: Date | null;

  @Column('text', { nullable: true })
  delegationReason!: string | null;

  // ==================== Supersession ====================

  @Column('uuid', { nullable: true })
  supersededBy!: string | null; // DocumentApproval ID that replaces this

  @Column('timestamp', { nullable: true })
  supersededAt!: Date | null;

  // ==================== Submitter Info ====================

  @Column('uuid')
  submittedBy!: string;

  @Column('varchar', { length: 100 })
  submittedByName!: string;

  @Column('varchar', { length: 200 })
  submittedByEmail!: string;

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp', { nullable: true })
  withdrawnAt!: Date | null;

  @Column('uuid', { nullable: true })
  withdrawnBy!: string | null;

  @Column('text', { nullable: true })
  withdrawalReason!: string | null;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    category?: string;
    tags?: string[];
    originalDueDate?: Date; // Before extensions
    extensionHistory?: Array<{
      extendedBy: string;
      extendedAt: Date;
      oldDate: Date;
      newDate: Date;
      reason: string;
    }>;
    reviewDuration?: number; // Minutes spent reviewing
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Check if approval is complete (approved or rejected)
   */
  isComplete(): boolean {
    return [
      ApprovalStatus.APPROVED,
      ApprovalStatus.REJECTED,
      ApprovalStatus.CONDITIONALLY_APPROVED,
      ApprovalStatus.WITHDRAWN,
      ApprovalStatus.SUPERSEDED,
    ].includes(this.status);
  }

  /**
   * Check if approval is pending
   */
  isPending(): boolean {
    return [ApprovalStatus.PENDING, ApprovalStatus.IN_REVIEW].includes(
      this.status,
    );
  }

  /**
   * Check if approval is successful (approved or conditionally approved)
   */
  isSuccessful(): boolean {
    return [
      ApprovalStatus.APPROVED,
      ApprovalStatus.CONDITIONALLY_APPROVED,
    ].includes(this.status);
  }

  /**
   * Check if approval can be updated
   */
  canUpdate(): boolean {
    return !this.isComplete() && !this.isExpired;
  }

  /**
   * Calculate days until due
   */
  daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diff = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days until expiration
   */
  daysUntilExpiration(): number | null {
    if (!this.expiresAt) return null;
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if signature is valid
   */
  hasValidSignature(): boolean {
    return this.isSigned && this.signature !== null && !this.isExpired;
  }
}
