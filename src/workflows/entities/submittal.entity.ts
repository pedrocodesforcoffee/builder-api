import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Submittal Status Enum
 *
 * State machine for submittal workflow:
 * DRAFT -> SUBMITTED -> IN_REVIEW -> REVIEWED -> CLOSED
 *                                             -> VOIDED (can happen from any state)
 */
export enum SubmittalStatus {
  DRAFT = 'draft', // Initial creation, not yet submitted
  SUBMITTED = 'submitted', // Submitted for review
  IN_REVIEW = 'in_review', // Under active review
  REVIEWED = 'reviewed', // All reviews completed
  CLOSED = 'closed', // Final status assigned, submittal complete
  VOIDED = 'voided', // Cancelled/voided
}

/**
 * Submittal Final Status Enum
 *
 * Industry-standard submittal review status codes:
 * A = Approved (no exceptions)
 * B = Approved as noted (minor corrections required, no resubmittal)
 * C = Approved as noted (corrections required, resubmit)
 * D = Rejected (revise and resubmit)
 * E = Submit specified item (for information only)
 * F = Returned for revision and resubmittal
 */
export enum SubmittalFinalStatus {
  A = 'A', // Approved
  B = 'B', // Approved as noted
  C = 'C', // Approved as noted - resubmit
  D = 'D', // Rejected - revise and resubmit
  E = 'E', // For information only
  F = 'F', // Returned for revision
}

/**
 * Submittal Type Enum
 *
 * Types of submittals per AIA standards
 */
export enum SubmittalType {
  PRODUCT_DATA = 'product_data', // Product literature, specs
  SHOP_DRAWING = 'shop_drawing', // Fabrication drawings
  SAMPLE = 'sample', // Physical samples
  MANUFACTURER_CERT = 'manufacturer_cert', // Certifications
  TEST_REPORT = 'test_report', // Test results
  DESIGN_DATA = 'design_data', // Design calculations
  CLOSEOUT = 'closeout', // Closeout documents
  OTHER = 'other', // Other types
}

/**
 * Workflow Type Enum
 *
 * Defines how reviewers are processed
 */
export enum WorkflowType {
  SEQUENTIAL = 'sequential', // One reviewer at a time in order
  PARALLEL = 'parallel', // All reviewers at once
  HYBRID = 'hybrid', // Combination of sequential and parallel
}

/**
 * Submittal Entity
 *
 * Represents a submittal package for contractor-to-architect workflow.
 * Manages document review, approval, and state tracking.
 *
 * Key Features:
 * - State machine for workflow tracking
 * - Industry-standard status codes (A/B/C/D/E/F)
 * - Multi-party review with sequential/parallel workflows
 * - Complete audit trail with hash chains
 * - Digital signature support
 * - Automatic deadline tracking
 */
@Entity('submittals')
@Index(['projectId', 'status', 'dueDate'])
@Index(['projectId', 'submittalNumber'])
@Index(['projectId', 'specSection'])
@Index(['submittedBy', 'status'])
@Index(['assignedTo', 'status'])
export class Submittal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Identification ====================

  @Column('uuid')
  @Index()
  projectId!: string;

  @Column('varchar', { length: 50 })
  submittalNumber!: string; // e.g., "S-001", "S-002.1"

  @Column('varchar', { length: 200 })
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  submittalType!: SubmittalType;

  @Column('varchar', { length: 20, nullable: true })
  specSection!: string | null; // MasterFormat section (e.g., "03 30 00")

  @Column('varchar', { length: 100, nullable: true })
  specTitle!: string | null; // Spec section title

  @Column('int', { default: 1 })
  revisionNumber!: number; // Track resubmittals

  @Column('varchar', { length: 50, nullable: true })
  previousSubmittalId!: string | null; // Link to previous revision

  // ==================== Parties ====================

  @Column('uuid')
  submittedBy!: string; // Contractor user ID

  @Column('varchar', { length: 100 })
  submittedByName!: string;

  @Column('varchar', { length: 100 })
  submittedByCompany!: string; // Contractor company

  @Column('uuid', { nullable: true })
  assignedTo!: string | null; // Primary reviewer (architect)

  @Column('varchar', { length: 100, nullable: true })
  assignedToName!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  assignedToCompany!: string | null; // Architect firm

  // ==================== Workflow ====================

  @Column({ type: 'varchar', length: 50, default: SubmittalStatus.DRAFT })
  @Index()
  status!: SubmittalStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  workflowType!: WorkflowType;

  @Column('uuid', { nullable: true })
  workflowTemplateId!: string | null; // Optional template used

  @Column('int', { default: 0 })
  totalReviewers!: number; // Total number of reviewers

  @Column('int', { default: 0 })
  completedReviews!: number; // Number of completed reviews

  @Column('boolean', { default: false })
  requiresAllApprovals!: boolean; // If true, all reviewers must approve

  // ==================== Timing ====================

  @Column('timestamp', { nullable: true })
  submittedAt!: Date | null; // When submitted for review

  @Column('timestamp', { nullable: true })
  dueDate!: Date | null; // Expected response date

  @Column('int', { nullable: true })
  leadTimeDays!: number | null; // Expected lead time

  @Column('timestamp', { nullable: true })
  reviewStartedAt!: Date | null; // When first reviewer started

  @Column('timestamp', { nullable: true })
  reviewCompletedAt!: Date | null; // When all reviews completed

  @Column('timestamp', { nullable: true })
  closedAt!: Date | null; // When final status assigned

  @Column('boolean', { default: false })
  isOverdue!: boolean; // Computed flag

  // ==================== Final Review ====================

  @Column({ type: 'varchar', length: 10, nullable: true })
  finalStatus!: SubmittalFinalStatus | null; // A/B/C/D/E/F

  @Column('text', { nullable: true })
  finalComments!: string | null; // Architect's final comments

  @Column('uuid', { nullable: true })
  finalReviewedBy!: string | null; // Who assigned final status

  @Column('varchar', { length: 100, nullable: true })
  finalReviewedByName!: string | null;

  @Column('timestamp', { nullable: true })
  finalReviewedAt!: Date | null;

  @Column('boolean', { default: false })
  requiresResubmittal!: boolean; // For status C, D, F

  @Column('text', { nullable: true })
  resubmittalInstructions!: string | null;

  // ==================== Attachments & References ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    coverSheetUrl?: string; // S3 URL for cover sheet
    stampedDrawingsUrl?: string; // S3 URL for stamped drawings
    transmittalId?: string; // Related transmittal
    ballInCourtDays?: number; // Days in each party's court
    contractorDays?: number;
    architectDays?: number;
    [key: string]: any;
  } | null;

  // ==================== Integrity & Audit ====================

  @Column('varchar', { length: 64, nullable: true })
  contentHash!: string | null; // SHA-256 of submittal content

  @Column('varchar', { length: 64, nullable: true })
  previousHash!: string | null; // Hash of previous submittal (blockchain style)

  @Column('boolean', { default: false })
  isDigitallySigned!: boolean;

  @Column('jsonb', { nullable: true })
  digitalSignature!: {
    signedBy: string;
    signedAt: Date;
    signature: string; // Cryptographic signature
    certificateId?: string;
  } | null;

  @Column('boolean', { default: false })
  isTampered!: boolean; // Flag if hash doesn't match

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp', { nullable: true })
  voidedAt!: Date | null;

  @Column('uuid', { nullable: true })
  voidedBy!: string | null;

  @Column('text', { nullable: true })
  voidReason!: string | null;

  // ==================== Relationships ====================

  // One submittal can have multiple documents attached
  // (Defined in SubmittalDocument entity as ManyToOne to Submittal)

  // One submittal can have multiple reviewers
  // (Defined in SubmittalReviewer entity as ManyToOne to Submittal)

  // One submittal can have multiple comments
  // (Defined in SubmittalComment entity as ManyToOne to Submittal)

  // One submittal can have multiple events (audit trail)
  // (Defined in SubmittalEvent entity as ManyToOne to Submittal)

  // ==================== Methods ====================

  /**
   * Check if submittal can transition to new status
   */
  canTransitionTo(newStatus: SubmittalStatus): boolean {
    const transitions: Record<SubmittalStatus, SubmittalStatus[]> = {
      [SubmittalStatus.DRAFT]: [
        SubmittalStatus.SUBMITTED,
        SubmittalStatus.VOIDED,
      ],
      [SubmittalStatus.SUBMITTED]: [
        SubmittalStatus.IN_REVIEW,
        SubmittalStatus.VOIDED,
      ],
      [SubmittalStatus.IN_REVIEW]: [
        SubmittalStatus.REVIEWED,
        SubmittalStatus.VOIDED,
      ],
      [SubmittalStatus.REVIEWED]: [
        SubmittalStatus.CLOSED,
        SubmittalStatus.VOIDED,
      ],
      [SubmittalStatus.CLOSED]: [SubmittalStatus.VOIDED],
      [SubmittalStatus.VOIDED]: [], // Terminal state
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }

  /**
   * Check if submittal is in a terminal state
   */
  isTerminal(): boolean {
    return [SubmittalStatus.CLOSED, SubmittalStatus.VOIDED].includes(
      this.status,
    );
  }

  /**
   * Check if submittal requires resubmission based on final status
   */
  needsResubmittal(): boolean {
    return [
      SubmittalFinalStatus.C,
      SubmittalFinalStatus.D,
      SubmittalFinalStatus.F,
    ].includes(this.finalStatus as SubmittalFinalStatus);
  }

  /**
   * Calculate days remaining until due date
   */
  daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diff = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate review progress percentage
   */
  reviewProgress(): number {
    if (this.totalReviewers === 0) return 0;
    return (this.completedReviews / this.totalReviewers) * 100;
  }
}
