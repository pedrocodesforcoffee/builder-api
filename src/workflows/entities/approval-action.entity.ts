import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { DocumentApproval } from './document-approval.entity';
import { ApprovalChain } from './approval-chain.entity';

/**
 * Action Type Enum
 *
 * Types of actions that can be taken on approvals
 */
export enum ApprovalActionType {
  // Approval actions
  APPROVE = 'approve',
  REJECT = 'reject',
  CONDITIONALLY_APPROVE = 'conditionally_approve',
  REQUEST_CHANGES = 'request_changes',
  WITHDRAW = 'withdraw',

  // Review actions
  START_REVIEW = 'start_review',
  PAUSE_REVIEW = 'pause_review',
  RESUME_REVIEW = 'resume_review',
  COMPLETE_REVIEW = 'complete_review',

  // Administrative actions
  ASSIGN = 'assign',
  REASSIGN = 'reassign',
  DELEGATE = 'delegate',
  ESCALATE = 'escalate',
  EXTEND_DEADLINE = 'extend_deadline',
  ADD_COMMENT = 'add_comment',
  ADD_ATTACHMENT = 'add_attachment',

  // Signature actions
  SIGN = 'sign',
  VERIFY_SIGNATURE = 'verify_signature',
  REVOKE_SIGNATURE = 'revoke_signature',

  // Stamp actions
  STAMP_DOCUMENT = 'stamp_document',
  REMOVE_STAMP = 'remove_stamp',

  // System actions
  AUTO_APPROVE = 'auto_approve',
  AUTO_REJECT = 'auto_reject',
  AUTO_ESCALATE = 'auto_escalate',
  EXPIRE = 'expire',
  SUPERSEDE = 'supersede',
  REMINDER_SENT = 'reminder_sent',
}

/**
 * ApprovalAction Entity
 *
 * Immutable audit log of all actions taken on document approvals.
 * Provides complete traceability of approval workflow execution.
 *
 * Features:
 * - Immutable action log
 * - Actor tracking
 * - Before/after snapshots
 * - Detailed change tracking
 * - Hash verification
 */
@Entity('approval_actions')
@Index(['documentApprovalId', 'createdAt'])
@Index(['approvalChainId', 'createdAt'])
@Index(['actionType', 'createdAt'])
@Index(['actorId', 'createdAt'])
export class ApprovalAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  @Index()
  documentApprovalId!: string;

  @ManyToOne(() => DocumentApproval, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentApprovalId' })
  documentApproval!: DocumentApproval;

  @Column('uuid')
  @Index()
  approvalChainId!: string;

  @ManyToOne(() => ApprovalChain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approvalChainId' })
  approvalChain!: ApprovalChain;

  @Column('int', { nullable: true })
  stepNumber!: number | null; // Approval chain step

  // ==================== Action Info ====================

  @Column({ type: 'varchar', length: 50 })
  @Index()
  actionType!: ApprovalActionType;

  @Column('text')
  description!: string; // Human-readable description

  @Column('text', { nullable: true })
  comments!: string | null; // User comments

  // ==================== Actor Info ====================

  @Column('uuid', { nullable: true })
  @Index()
  actorId!: string | null; // User who performed action (null for system)

  @Column('varchar', { length: 100, nullable: true })
  actorName!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  actorEmail!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  actorRole!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  actorCompany!: string | null;

  @Column('boolean', { default: false })
  isSystemAction!: boolean; // If triggered by system

  // ==================== Change Tracking ====================

  @Column('jsonb', { nullable: true })
  changeData!: {
    field?: string; // Field that changed
    oldValue?: any; // Previous value
    newValue?: any; // New value
    oldStatus?: string; // Previous status
    newStatus?: string; // New status
    reason?: string; // Reason for change
    [key: string]: any;
  } | null;

  @Column('jsonb', { nullable: true })
  snapshot!: {
    status?: string;
    approverId?: string;
    stepNumber?: number;
    dueDate?: Date;
    conditions?: string;
    [key: string]: any;
  } | null; // Snapshot at action time

  // ==================== Attachments & References ====================

  @Column('simple-array', { nullable: true })
  attachmentIds!: string[] | null; // Documents attached with action

  @Column('simple-array', { nullable: true })
  markupIds!: string[] | null; // Markups added

  @Column('uuid', { nullable: true })
  relatedActionId!: string | null; // Related action (e.g., delegation response)

  // ==================== Delegation ====================

  @Column('uuid', { nullable: true })
  delegatedFrom!: string | null; // If action is by delegate

  @Column('uuid', { nullable: true })
  delegatedTo!: string | null; // If delegating to someone

  @Column('text', { nullable: true })
  delegationReason!: string | null;

  // ==================== Digital Signature ====================

  @Column('boolean', { default: false })
  includesSignature!: boolean;

  @Column('jsonb', { nullable: true })
  signature!: {
    signedBy: string;
    signedAt: Date;
    signature: string; // Cryptographic signature
    certificateId?: string;
    algorithm?: string; // e.g., 'RSA-SHA256'
    timestamp?: string; // Trusted timestamp
  } | null;

  // ==================== Request/Response ====================

  @Column('jsonb', { nullable: true })
  requestData!: {
    requestedChanges?: string[];
    conditions?: string[];
    requiredDocuments?: string[];
    additionalReviewers?: string[];
    [key: string]: any;
  } | null;

  @Column('jsonb', { nullable: true })
  responseData!: {
    addressedChanges?: string[];
    providedDocuments?: string[];
    explanations?: Record<string, string>;
    [key: string]: any;
  } | null;

  // ==================== Metadata ====================

  @Column('varchar', { length: 50, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  sessionId!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  deviceId!: string | null;

  @Column('jsonb', { nullable: true })
  geolocation!: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  } | null;

  // ==================== Notification ====================

  @Column('simple-array', { nullable: true })
  notifiedUserIds!: string[] | null; // Users notified of action

  @Column('boolean', { default: false })
  notificationSent!: boolean;

  @Column('timestamp', { nullable: true })
  notificationSentAt!: Date | null;

  // ==================== Integrity & Hash ====================

  @Column('varchar', { length: 64 })
  @Index()
  actionHash!: string; // SHA-256 of action data

  @Column('varchar', { length: 64, nullable: true })
  previousActionHash!: string | null; // Hash of previous action (blockchain style)

  @Column('int', { default: 0 })
  sequenceNumber!: number; // Order in action chain

  @Column('boolean', { default: false })
  isVerified!: boolean;

  @Column('timestamp', { nullable: true })
  verifiedAt!: Date | null;

  // ==================== Timing ====================

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @Column('int', { nullable: true })
  durationMs!: number | null; // Time taken to perform action

  // Note: No UpdateDateColumn - actions are immutable

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    automationRuleId?: string; // If triggered by automation
    triggeredBy?: string; // What triggered this action
    parentActionId?: string; // Parent action if nested
    workflow?: {
      phase: string;
      milestone: string;
    };
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Generate action hash for integrity verification
   */
  generateHash(): string {
    const crypto = require('crypto');

    const data = JSON.stringify({
      documentApprovalId: this.documentApprovalId,
      approvalChainId: this.approvalChainId,
      actionType: this.actionType,
      actorId: this.actorId,
      createdAt: this.createdAt.toISOString(),
      changeData: this.changeData,
      previousActionHash: this.previousActionHash,
      sequenceNumber: this.sequenceNumber,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify action hash matches computed hash
   */
  verifyHash(): boolean {
    const computedHash = this.generateHash();
    return this.actionHash === computedHash;
  }

  /**
   * Check if action is an approval decision
   */
  isDecision(): boolean {
    return [
      ApprovalActionType.APPROVE,
      ApprovalActionType.REJECT,
      ApprovalActionType.CONDITIONALLY_APPROVE,
      ApprovalActionType.REQUEST_CHANGES,
    ].includes(this.actionType);
  }

  /**
   * Check if action is system-generated
   */
  isSystemGenerated(): boolean {
    return (
      this.isSystemAction ||
      [
        ApprovalActionType.AUTO_APPROVE,
        ApprovalActionType.AUTO_REJECT,
        ApprovalActionType.AUTO_ESCALATE,
        ApprovalActionType.EXPIRE,
        ApprovalActionType.REMINDER_SENT,
      ].includes(this.actionType)
    );
  }

  /**
   * Check if action includes signature
   */
  hasSigned(): boolean {
    return this.includesSignature && this.signature !== null;
  }

  /**
   * Get human-readable action description
   */
  getDescription(): string {
    if (this.description) return this.description;

    const actor = this.actorName || 'System';

    switch (this.actionType) {
      case ApprovalActionType.APPROVE:
        return `${actor} approved the document`;
      case ApprovalActionType.REJECT:
        return `${actor} rejected the document`;
      case ApprovalActionType.CONDITIONALLY_APPROVE:
        return `${actor} conditionally approved the document`;
      case ApprovalActionType.REQUEST_CHANGES:
        return `${actor} requested changes`;
      case ApprovalActionType.WITHDRAW:
        return `${actor} withdrew the approval request`;
      case ApprovalActionType.START_REVIEW:
        return `${actor} started reviewing`;
      case ApprovalActionType.COMPLETE_REVIEW:
        return `${actor} completed review`;
      case ApprovalActionType.DELEGATE:
        return `${actor} delegated to another reviewer`;
      case ApprovalActionType.ESCALATE:
        return `Approval escalated`;
      case ApprovalActionType.EXTEND_DEADLINE:
        return `${actor} extended the deadline`;
      case ApprovalActionType.SIGN:
        return `${actor} digitally signed`;
      case ApprovalActionType.STAMP_DOCUMENT:
        return `${actor} stamped the document`;
      case ApprovalActionType.AUTO_APPROVE:
        return `System auto-approved`;
      case ApprovalActionType.EXPIRE:
        return `Approval expired`;
      default:
        return `${this.actionType} action`;
    }
  }
}
