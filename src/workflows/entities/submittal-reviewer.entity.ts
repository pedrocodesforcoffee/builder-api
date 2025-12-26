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
import { Submittal, SubmittalFinalStatus } from './submittal.entity';

/**
 * Reviewer Status Enum
 *
 * Status of individual reviewer's review
 */
export enum ReviewerStatus {
  PENDING = 'pending', // Waiting for their turn
  IN_PROGRESS = 'in_progress', // Currently reviewing
  COMPLETED = 'completed', // Review completed
  SKIPPED = 'skipped', // Skipped in workflow
  DELEGATED = 'delegated', // Delegated to someone else
}

/**
 * Reviewer Type Enum
 *
 * Role of reviewer in submittal process
 */
export enum ReviewerType {
  PRIMARY = 'primary', // Primary architect/engineer
  CONSULTANT = 'consultant', // Specialty consultant
  OWNER = 'owner', // Owner representative
  CONTRACTOR = 'contractor', // Contractor (for returned submittals)
  OTHER = 'other', // Other party
}

/**
 * Review Decision Enum
 *
 * Individual reviewer's decision
 */
export enum ReviewDecision {
  APPROVE = 'approve', // Approve
  APPROVE_WITH_NOTES = 'approve_with_notes', // Approve with notes
  REJECT = 'reject', // Reject
  REVISE_RESUBMIT = 'revise_resubmit', // Revise and resubmit
  FOR_INFORMATION = 'for_information', // For information only
}

/**
 * SubmittalReviewer Entity
 *
 * Represents a reviewer in a submittal workflow.
 * Tracks review status, decisions, and timing for each reviewer.
 *
 * Features:
 * - Sequential and parallel workflow support
 * - Review delegation
 * - Individual decisions and comments
 * - Digital signatures
 * - Reminder tracking
 */
@Entity('submittal_reviewers')
@Index(['submittalId', 'status'])
@Index(['submittalId', 'reviewOrder'])
@Index(['userId', 'status'])
@Index(['dueDate', 'status'])
export class SubmittalReviewer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal!: Submittal;

  // ==================== Reviewer Info ====================

  @Column('uuid')
  userId!: string;

  @Column('varchar', { length: 100 })
  userName!: string;

  @Column('varchar', { length: 200 })
  userEmail!: string;

  @Column('varchar', { length: 100, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 50 })
  reviewerType!: ReviewerType;

  @Column('varchar', { length: 100, nullable: true })
  discipline!: string | null; // For consultants (structural, MEP, etc.)

  // ==================== Workflow Position ====================

  @Column('int', { default: 0 })
  reviewOrder!: number; // Order in sequential workflow (0 = parallel)

  @Column('boolean', { default: false })
  isRequired!: boolean; // If review is mandatory

  @Column('boolean', { default: false })
  canDelegate!: boolean; // If reviewer can delegate to others

  @Column('boolean', { default: false })
  isFinalReviewer!: boolean; // If this reviewer assigns final status

  // ==================== Status ====================

  @Column({ type: 'varchar', length: 50, default: ReviewerStatus.PENDING })
  status!: ReviewerStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  decision!: ReviewDecision | null;

  @Column('text', { nullable: true })
  comments!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  recommendedStatus!: SubmittalFinalStatus | null; // Recommended A/B/C/D/E/F

  // ==================== Timing ====================

  @Column('timestamp', { nullable: true })
  assignedAt!: Date | null; // When assigned to reviewer

  @Column('timestamp', { nullable: true })
  dueDate!: Date | null; // Expected completion date

  @Column('timestamp', { nullable: true })
  startedAt!: Date | null; // When reviewer started review

  @Column('timestamp', { nullable: true })
  completedAt!: Date | null; // When review completed

  @Column('int', { nullable: true })
  reviewDurationMinutes!: number | null; // Time spent reviewing

  @Column('boolean', { default: false })
  isOverdue!: boolean;

  // ==================== Delegation ====================

  @Column('boolean', { default: false })
  isDelegated!: boolean;

  @Column('uuid', { nullable: true })
  delegatedTo!: string | null; // User ID of delegate

  @Column('varchar', { length: 100, nullable: true })
  delegatedToName!: string | null;

  @Column('timestamp', { nullable: true })
  delegatedAt!: Date | null;

  @Column('text', { nullable: true })
  delegationReason!: string | null;

  // ==================== Documents & Markups ====================

  @Column('simple-array', { nullable: true })
  reviewedDocumentIds!: string[] | null; // IDs of documents reviewed

  @Column('boolean', { default: false })
  hasMarkups!: boolean;

  @Column('simple-array', { nullable: true })
  markupDocumentIds!: string[] | null; // IDs of markup documents

  @Column('simple-array', { nullable: true })
  attachmentDocumentIds!: string[] | null; // Additional attachments

  // ==================== Digital Signature ====================

  @Column('boolean', { default: false })
  isSigned!: boolean;

  @Column('jsonb', { nullable: true })
  signature!: {
    signedBy: string;
    signedAt: Date;
    signature: string; // Cryptographic signature
    ipAddress?: string;
    userAgent?: string;
    certificateId?: string;
  } | null;

  // ==================== Reminders ====================

  @Column('int', { default: 0 })
  remindersSent!: number; // Count of reminders sent

  @Column('timestamp', { nullable: true })
  lastReminderSentAt!: Date | null;

  @Column('timestamp', { nullable: true })
  nextReminderDueAt!: Date | null;

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    notificationPreferences?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    reviewChecklist?: Array<{
      item: string;
      checked: boolean;
      notes?: string;
    }>;
    timeTracking?: Array<{
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
    }>;
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Check if reviewer can start their review
   */
  canStartReview(): boolean {
    return (
      this.status === ReviewerStatus.PENDING ||
      this.status === ReviewerStatus.IN_PROGRESS
    );
  }

  /**
   * Check if review is complete
   */
  isComplete(): boolean {
    return (
      this.status === ReviewerStatus.COMPLETED ||
      this.status === ReviewerStatus.SKIPPED ||
      this.status === ReviewerStatus.DELEGATED
    );
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
   * Check if reminder should be sent
   */
  shouldSendReminder(reminderIntervalDays: number = 3): boolean {
    if (this.isComplete()) return false;
    if (!this.lastReminderSentAt) return true;

    const daysSinceLastReminder =
      (Date.now() - this.lastReminderSentAt.getTime()) /
      (1000 * 60 * 60 * 24);
    return daysSinceLastReminder >= reminderIntervalDays;
  }
}
