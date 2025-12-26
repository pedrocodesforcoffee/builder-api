import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Budget } from './budget.entity';
import { CostCode } from './cost-code.entity';
import { CostEntry } from './cost-entry.entity';
import { CostTransferStatus } from '../enums/cost-transfer-status.enum';

/**
 * CostTransfer Entity
 *
 * Represents a cost transfer request between cost codes.
 * Cost transfers allow moving costs from one cost code to another,
 * typically when costs were initially charged to the wrong code or
 * when budget reallocation is needed.
 *
 * Features:
 * - Workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → VOID (optional)
 * - Auto-generated transfer numbers (CT-2025-00001)
 * - Creates offsetting cost entries (debit/credit) when approved
 * - Approval tracking with reason and rejection support
 * - Void capability for reversing approved transfers
 * - Links to the created cost entries for audit trail
 *
 * @entity cost_transfers
 */
@Entity('cost_transfers')
@Index('IDX_cost_transfer_project', ['projectId'])
@Index('IDX_cost_transfer_budget', ['budgetId'])
@Index('IDX_cost_transfer_status', ['status'])
@Index('IDX_cost_transfer_requested_at', ['requestedAt'])
@Index('IDX_cost_transfer_number', ['transferNumber'], { unique: true })
export class CostTransfer {
  /**
   * Unique identifier for the cost transfer (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== IDENTIFICATION ====================

  /**
   * Auto-generated transfer number (e.g., CT-2025-00001)
   * Format: CT-{YEAR}-{5-digit-sequence}
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'transfer_number',
    nullable: false,
  })
  transferNumber!: string;

  /**
   * Project ID
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Budget ID
   */
  @Column({
    type: 'uuid',
    name: 'budget_id',
    nullable: false,
  })
  budgetId!: string;

  // ==================== TRANSFER DETAILS ====================

  /**
   * Source cost code ID (where cost is being transferred FROM)
   */
  @Column({
    type: 'uuid',
    name: 'from_cost_code_id',
    nullable: false,
  })
  fromCostCodeId!: string;

  /**
   * Destination cost code ID (where cost is being transferred TO)
   */
  @Column({
    type: 'uuid',
    name: 'to_cost_code_id',
    nullable: false,
  })
  toCostCodeId!: string;

  /**
   * Amount to transfer
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  amount!: number;

  /**
   * Reason for the transfer
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  reason!: string;

  /**
   * Status of the transfer
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CostTransferStatus.DRAFT,
  })
  status!: CostTransferStatus;

  /**
   * Reason for voiding the transfer (if status is VOID)
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'void_reason',
    nullable: true,
  })
  voidReason?: string;

  // ==================== REQUEST TRACKING ====================

  /**
   * User ID who requested the transfer
   */
  @Column({
    type: 'uuid',
    name: 'requested_by_id',
    nullable: false,
  })
  requestedById!: string;

  /**
   * Timestamp when transfer was requested
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'requested_at',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  requestedAt!: Date;

  // ==================== APPROVAL TRACKING ====================

  /**
   * User ID who approved the transfer
   */
  @Column({
    type: 'uuid',
    name: 'approved_by_id',
    nullable: true,
  })
  approvedById?: string;

  /**
   * Timestamp when transfer was approved
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'approved_at',
    nullable: true,
  })
  approvedAt?: Date;

  // ==================== REJECTION TRACKING ====================

  /**
   * User ID who rejected the transfer
   */
  @Column({
    type: 'uuid',
    name: 'rejected_by_id',
    nullable: true,
  })
  rejectedById?: string;

  /**
   * Timestamp when transfer was rejected
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'rejected_at',
    nullable: true,
  })
  rejectedAt?: Date;

  /**
   * Reason for rejection
   */
  @Column({
    type: 'text',
    name: 'rejection_reason',
    nullable: true,
  })
  rejectionReason?: string;

  // ==================== VOID TRACKING ====================

  /**
   * Timestamp when transfer was voided
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'voided_at',
    nullable: true,
  })
  voidedAt?: Date;

  /**
   * User ID who voided the transfer
   */
  @Column({
    type: 'uuid',
    name: 'voided_by_id',
    nullable: true,
  })
  voidedById?: string;

  // ==================== COST ENTRY REFERENCES ====================

  /**
   * Cost Entry ID for the debit (from) entry
   * References the cost entry that debits the source cost code
   */
  @Column({
    type: 'uuid',
    name: 'from_entry_id',
    nullable: true,
  })
  fromEntryId?: string;

  /**
   * Cost Entry ID for the credit (to) entry
   * References the cost entry that credits the destination cost code
   */
  @Column({
    type: 'uuid',
    name: 'to_entry_id',
    nullable: true,
  })
  toEntryId?: string;

  // ==================== AUDIT FIELDS ====================

  /**
   * Timestamp when the cost transfer was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the cost transfer was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Project relationship
   */
  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Budget relationship
   */
  @ManyToOne(() => Budget, { nullable: false })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  /**
   * From Cost Code relationship (source)
   */
  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'from_cost_code_id' })
  fromCostCode!: CostCode;

  /**
   * To Cost Code relationship (destination)
   */
  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'to_cost_code_id' })
  toCostCode!: CostCode;

  /**
   * Requested by user
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy!: User;

  /**
   * Approved by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  /**
   * Rejected by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy?: User;

  /**
   * Voided by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy?: User;

  /**
   * From Cost Entry relationship (debit entry)
   * The cost entry that debits the source cost code
   */
  @ManyToOne(() => CostEntry, { nullable: true })
  @JoinColumn({ name: 'from_entry_id' })
  fromEntry?: CostEntry;

  /**
   * To Cost Entry relationship (credit entry)
   * The cost entry that credits the destination cost code
   */
  @ManyToOne(() => CostEntry, { nullable: true })
  @JoinColumn({ name: 'to_entry_id' })
  toEntry?: CostEntry;

  // ==================== HOOKS ====================

  /**
   * Generate transfer number before insert
   * Format: CT-{YEAR}-{5-digit-random}
   */
  @BeforeInsert()
  generateTransferNumber() {
    if (!this.transferNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 100000);
      this.transferNumber = `CT-${year}-${String(random).padStart(5, '0')}`;
    }
  }
}
