import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Commitment } from './commitment.entity';
import { ScheduleOfValues } from './schedule-of-values.entity';
import { PaymentApplicationItem } from './payment-application-item.entity';
import { LienWaiver } from './lien-waiver.entity';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';

/**
 * PaymentApplication Entity
 *
 * Represents a payment application (AIA G702/G703) for a commitment.
 * Payment applications document work completed and materials stored during
 * a billing period, requesting payment from the owner.
 *
 * Features:
 * - Sequential application numbering per commitment
 * - Billing period tracking
 * - Status workflow (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PAID)
 * - Financial totals with retention calculations
 * - Workflow audit trail (submitted by, approved by, etc.)
 * - Lien waiver tracking (conditional and unconditional)
 * - PDF generation for AIA forms
 *
 * @entity payment_applications
 */
@Entity('payment_applications')
@Index('IDX_pay_app_commitment', ['commitmentId'])
@Index('IDX_pay_app_sov', ['sovId'])
@Index('IDX_pay_app_project', ['projectId'])
@Index('IDX_pay_app_status', ['status'])
@Index('IDX_pay_app_number', ['commitmentId', 'applicationNumber'], {
  unique: true,
})
export class PaymentApplication {
  /**
   * Unique identifier for the payment application (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Commitment ID
   */
  @Column({
    type: 'uuid',
    name: 'commitment_id',
    nullable: false,
  })
  commitmentId!: string;

  /**
   * Schedule of Values ID
   */
  @Column({
    type: 'uuid',
    name: 'sov_id',
    nullable: false,
  })
  sovId!: string;

  /**
   * Project ID (denormalized for efficient queries)
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  // ==================== APPLICATION DETAILS ====================

  /**
   * Application number (sequential per commitment, 1-based)
   * Example: Application #1, Application #2, etc.
   */
  @Column({
    type: 'integer',
    name: 'application_number',
    nullable: false,
  })
  applicationNumber!: number;

  /**
   * Application date
   * The date this payment application was created/submitted
   */
  @Column({
    type: 'date',
    name: 'application_date',
    nullable: false,
  })
  applicationDate!: Date;

  /**
   * Billing period start date
   */
  @Column({
    type: 'date',
    name: 'period_start',
    nullable: false,
  })
  periodStart!: Date;

  /**
   * Billing period end date
   */
  @Column({
    type: 'date',
    name: 'period_end',
    nullable: false,
  })
  periodEnd!: Date;

  // ==================== STATUS WORKFLOW ====================

  /**
   * Payment application status
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: PaymentApplicationStatus.DRAFT,
  })
  status!: PaymentApplicationStatus;

  // ==================== FINANCIAL TOTALS ====================

  /**
   * Total completed and stored to date (Column G on AIA G702)
   * Sum of work completed + materials stored from all line items
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_completed_and_stored',
    nullable: false,
    default: 0,
  })
  totalCompletedAndStored!: number;

  /**
   * Retainage percentage (e.g., 10.00 = 10%)
   * Copied from commitment at time of creation
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'retainage_percent',
    nullable: false,
    default: 0,
  })
  retainagePercent!: number;

  /**
   * Retainage amount
   * Calculated as: totalCompletedAndStored × (retainagePercent / 100)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'retainage_amount',
    nullable: false,
    default: 0,
  })
  retainageAmount!: number;

  /**
   * Total earned less retainage
   * Calculated as: totalCompletedAndStored - retainageAmount
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_earned_less_retainage',
    nullable: false,
    default: 0,
  })
  totalEarnedLessRetainage!: number;

  /**
   * Previous payments (cumulative from prior approved pay apps)
   * Sum of totalEarnedLessRetainage from all prior approved applications
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'previous_payments',
    nullable: false,
    default: 0,
  })
  previousPayments!: number;

  /**
   * Current payment due
   * Calculated as: totalEarnedLessRetainage - previousPayments
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'current_payment_due',
    nullable: false,
    default: 0,
  })
  currentPaymentDue!: number;

  // ==================== WORKFLOW TRACKING ====================

  /**
   * User ID who submitted this payment application
   */
  @Column({
    type: 'uuid',
    name: 'submitted_by_id',
    nullable: true,
  })
  submittedById?: string;

  /**
   * Timestamp when payment application was submitted
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'submitted_at',
    nullable: true,
  })
  submittedAt?: Date;

  /**
   * User ID who reviewed this payment application
   */
  @Column({
    type: 'uuid',
    name: 'reviewed_by_id',
    nullable: true,
  })
  reviewedById?: string;

  /**
   * Timestamp when payment application was reviewed
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'reviewed_at',
    nullable: true,
  })
  reviewedAt?: Date;

  /**
   * User ID who approved this payment application
   */
  @Column({
    type: 'uuid',
    name: 'approved_by_id',
    nullable: true,
  })
  approvedById?: string;

  /**
   * Timestamp when payment application was approved
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'approved_at',
    nullable: true,
  })
  approvedAt?: Date;

  /**
   * User ID who rejected this payment application
   */
  @Column({
    type: 'uuid',
    name: 'rejected_by_id',
    nullable: true,
  })
  rejectedById?: string;

  /**
   * Timestamp when payment application was rejected
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'rejected_at',
    nullable: true,
  })
  rejectedAt?: Date;

  /**
   * Rejection reason or notes
   */
  @Column({
    type: 'text',
    name: 'rejection_reason',
    nullable: true,
  })
  rejectionReason?: string;

  /**
   * User ID who marked payment as paid
   */
  @Column({
    type: 'uuid',
    name: 'paid_by_id',
    nullable: true,
  })
  paidById?: string;

  /**
   * Timestamp when payment was made
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'paid_at',
    nullable: true,
  })
  paidAt?: Date;

  // ==================== LIEN WAIVER TRACKING ====================

  /**
   * Has conditional lien waiver been received
   */
  @Column({
    type: 'boolean',
    name: 'has_conditional_waiver',
    nullable: false,
    default: false,
  })
  hasConditionalWaiver!: boolean;

  /**
   * Conditional lien waiver document URL (S3 or file path)
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'conditional_waiver_url',
    nullable: true,
  })
  conditionalWaiverUrl?: string;

  /**
   * Has unconditional lien waiver been received
   */
  @Column({
    type: 'boolean',
    name: 'has_unconditional_waiver',
    nullable: false,
    default: false,
  })
  hasUnconditionalWaiver!: boolean;

  /**
   * Unconditional lien waiver document URL (S3 or file path)
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'unconditional_waiver_url',
    nullable: true,
  })
  unconditionalWaiverUrl?: string;

  // ==================== PDF GENERATION ====================

  /**
   * Generated AIA G702 PDF URL
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'g702_pdf_url',
    nullable: true,
  })
  g702PdfUrl?: string;

  /**
   * Generated AIA G703 PDF URL
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'g703_pdf_url',
    nullable: true,
  })
  g703PdfUrl?: string;

  // ==================== TIMESTAMPS ====================

  /**
   * Timestamp when the payment application was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the payment application was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Commitment relationship
   */
  @ManyToOne(() => Commitment, { nullable: false })
  @JoinColumn({ name: 'commitment_id' })
  commitment!: Commitment;

  /**
   * Schedule of Values relationship
   */
  @ManyToOne(() => ScheduleOfValues, (sov) => sov.paymentApplications, {
    nullable: false,
  })
  @JoinColumn({ name: 'sov_id' })
  sov!: ScheduleOfValues;

  /**
   * Project relationship
   */
  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Payment application line items
   */
  @OneToMany(() => PaymentApplicationItem, (item) => item.paymentApplication)
  items?: PaymentApplicationItem[];

  /**
   * Lien waivers
   */
  @OneToMany(() => LienWaiver, (waiver) => waiver.paymentApplication)
  lienWaivers?: LienWaiver[];

  /**
   * Submitted by user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy?: User;

  /**
   * Reviewed by user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  /**
   * Approved by user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  /**
   * Rejected by user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy?: User;

  /**
   * Paid by user
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'paid_by_id' })
  paidBy?: User;
}
