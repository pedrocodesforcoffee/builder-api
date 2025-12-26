import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Submittal, SubmittalStatus, SubmittalFinalStatus } from './submittal.entity';

/**
 * Event Type Enum
 *
 * Types of events in submittal lifecycle
 */
export enum SubmittalEventType {
  // Lifecycle events
  CREATED = 'created',
  SUBMITTED = 'submitted',
  REVIEW_STARTED = 'review_started',
  REVIEW_COMPLETED = 'review_completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  VOIDED = 'voided',
  REOPENED = 'reopened',

  // Status changes
  STATUS_CHANGED = 'status_changed',
  FINAL_STATUS_ASSIGNED = 'final_status_assigned',

  // Reviewer events
  REVIEWER_ASSIGNED = 'reviewer_assigned',
  REVIEWER_REMOVED = 'reviewer_removed',
  REVIEWER_STARTED = 'reviewer_started',
  REVIEWER_COMPLETED = 'reviewer_completed',
  REVIEWER_DELEGATED = 'reviewer_delegated',
  REMINDER_SENT = 'reminder_sent',

  // Document events
  DOCUMENT_ADDED = 'document_added',
  DOCUMENT_REMOVED = 'document_removed',
  DOCUMENT_REPLACED = 'document_replaced',
  MARKUP_ADDED = 'markup_added',

  // Comment events
  COMMENT_ADDED = 'comment_added',
  COMMENT_EDITED = 'comment_edited',
  COMMENT_DELETED = 'comment_deleted',

  // Signature events
  SIGNED = 'signed',
  SIGNATURE_VERIFIED = 'signature_verified',
  SIGNATURE_FAILED = 'signature_failed',

  // Administrative events
  METADATA_UPDATED = 'metadata_updated',
  DUE_DATE_CHANGED = 'due_date_changed',
  DEADLINE_EXTENDED = 'deadline_extended',
  ESCALATED = 'escalated',
  OVERDUE = 'overdue',

  // Integrity events
  HASH_VERIFIED = 'hash_verified',
  HASH_MISMATCH = 'hash_mismatch',
  TAMPER_DETECTED = 'tamper_detected',
}

/**
 * SubmittalEvent Entity
 *
 * Complete audit trail for submittal lifecycle.
 * Uses blockchain-style hash chain for tamper detection.
 *
 * Features:
 * - Immutable event log
 * - Hash chain integrity
 * - Detailed change tracking
 * - Actor information
 * - Before/after snapshots
 */
@Entity('submittal_events')
@Index(['submittalId', 'createdAt'])
@Index(['submittalId', 'eventType'])
@Index(['actorId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class SubmittalEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal!: Submittal;

  @Column('uuid', { nullable: true })
  reviewerId!: string | null; // SubmittalReviewer ID if relevant

  @Column('uuid', { nullable: true })
  commentId!: string | null; // SubmittalComment ID if relevant

  @Column('uuid', { nullable: true })
  documentId!: string | null; // Document ID if relevant

  // ==================== Event Info ====================

  @Column({ type: 'varchar', length: 50 })
  eventType!: SubmittalEventType;

  @Column('text', { nullable: true })
  description!: string | null; // Human-readable description

  @Column('text', { nullable: true })
  details!: string | null; // Additional details

  // ==================== Actor Info ====================

  @Column('uuid', { nullable: true })
  actorId!: string | null; // User who triggered event (null for system)

  @Column('varchar', { length: 100, nullable: true })
  actorName!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  actorEmail!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  actorCompany!: string | null;

  @Column('boolean', { default: false })
  isSystemEvent!: boolean; // If triggered by system

  // ==================== Change Tracking ====================

  @Column('jsonb', { nullable: true })
  changeData!: {
    field?: string; // Field that changed
    oldValue?: any; // Previous value
    newValue?: any; // New value
    oldStatus?: SubmittalStatus; // Previous status
    newStatus?: SubmittalStatus; // New status
    finalStatus?: SubmittalFinalStatus; // If final status assigned
    [key: string]: any;
  } | null;

  @Column('jsonb', { nullable: true })
  snapshot!: {
    status?: SubmittalStatus;
    reviewProgress?: number;
    completedReviews?: number;
    totalReviewers?: number;
    dueDate?: Date;
    [key: string]: any;
  } | null; // Snapshot of submittal state at event time

  // ==================== Metadata ====================

  @Column('varchar', { length: 50, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  sessionId!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: {
    triggeredBy?: string; // What triggered this event
    automationRule?: string; // Automation rule ID if applicable
    notificationsSent?: string[]; // User IDs notified
    relatedEvents?: string[]; // Related event IDs
    [key: string]: any;
  } | null;

  // ==================== Hash Chain for Integrity ====================

  @Column('varchar', { length: 64 })
  @Index()
  eventHash!: string; // SHA-256 of this event

  @Column('varchar', { length: 64, nullable: true })
  previousEventHash!: string | null; // Hash of previous event (blockchain style)

  @Column('int', { default: 0 })
  sequenceNumber!: number; // Order in chain

  @Column('boolean', { default: false })
  isVerified!: boolean; // If hash has been verified

  @Column('timestamp', { nullable: true })
  verifiedAt!: Date | null;

  // ==================== Timestamp ====================

  @CreateDateColumn()
  createdAt!: Date;

  // Note: No UpdateDateColumn - events are immutable

  // ==================== Methods ====================

  /**
   * Generate event hash for integrity verification
   *
   * Hashes: submittalId + eventType + actorId + createdAt + changeData + previousHash
   */
  generateHash(): string {
    const crypto = require('crypto');

    const data = JSON.stringify({
      submittalId: this.submittalId,
      eventType: this.eventType,
      actorId: this.actorId,
      createdAt: this.createdAt.toISOString(),
      changeData: this.changeData,
      previousEventHash: this.previousEventHash,
      sequenceNumber: this.sequenceNumber,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify event hash matches computed hash
   */
  verifyHash(): boolean {
    const computedHash = this.generateHash();
    return this.eventHash === computedHash;
  }

  /**
   * Check if event represents a status change
   */
  isStatusChange(): boolean {
    return [
      SubmittalEventType.STATUS_CHANGED,
      SubmittalEventType.SUBMITTED,
      SubmittalEventType.APPROVED,
      SubmittalEventType.REJECTED,
      SubmittalEventType.CLOSED,
      SubmittalEventType.VOIDED,
    ].includes(this.eventType);
  }

  /**
   * Check if event is a lifecycle milestone
   */
  isMilestone(): boolean {
    return [
      SubmittalEventType.CREATED,
      SubmittalEventType.SUBMITTED,
      SubmittalEventType.REVIEW_STARTED,
      SubmittalEventType.REVIEW_COMPLETED,
      SubmittalEventType.APPROVED,
      SubmittalEventType.REJECTED,
      SubmittalEventType.CLOSED,
      SubmittalEventType.FINAL_STATUS_ASSIGNED,
    ].includes(this.eventType);
  }

  /**
   * Check if event involves a reviewer
   */
  isReviewerEvent(): boolean {
    return [
      SubmittalEventType.REVIEWER_ASSIGNED,
      SubmittalEventType.REVIEWER_REMOVED,
      SubmittalEventType.REVIEWER_STARTED,
      SubmittalEventType.REVIEWER_COMPLETED,
      SubmittalEventType.REVIEWER_DELEGATED,
    ].includes(this.eventType);
  }

  /**
   * Get human-readable event description
   */
  getDescription(): string {
    if (this.description) return this.description;

    const actor = this.actorName || 'System';

    switch (this.eventType) {
      case SubmittalEventType.CREATED:
        return `${actor} created the submittal`;
      case SubmittalEventType.SUBMITTED:
        return `${actor} submitted for review`;
      case SubmittalEventType.REVIEW_STARTED:
        return `Review started`;
      case SubmittalEventType.REVIEW_COMPLETED:
        return `All reviews completed`;
      case SubmittalEventType.APPROVED:
        return `${actor} approved the submittal`;
      case SubmittalEventType.REJECTED:
        return `${actor} rejected the submittal`;
      case SubmittalEventType.CLOSED:
        return `Submittal closed with final status`;
      case SubmittalEventType.VOIDED:
        return `${actor} voided the submittal`;
      case SubmittalEventType.STATUS_CHANGED:
        return `Status changed from ${this.changeData?.oldStatus} to ${this.changeData?.newStatus}`;
      case SubmittalEventType.FINAL_STATUS_ASSIGNED:
        return `${actor} assigned final status: ${this.changeData?.finalStatus}`;
      case SubmittalEventType.REVIEWER_ASSIGNED:
        return `${actor} assigned a reviewer`;
      case SubmittalEventType.REVIEWER_COMPLETED:
        return `${actor} completed their review`;
      case SubmittalEventType.COMMENT_ADDED:
        return `${actor} added a comment`;
      case SubmittalEventType.DOCUMENT_ADDED:
        return `${actor} added a document`;
      case SubmittalEventType.SIGNED:
        return `${actor} digitally signed`;
      default:
        return `${this.eventType} event`;
    }
  }
}
