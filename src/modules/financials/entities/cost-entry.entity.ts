import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Budget } from './budget.entity';
import { CostCode } from './cost-code.entity';
import { Commitment } from './commitment.entity';
import { PaymentApplication } from './payment-application.entity';
import { CostPeriod } from './cost-period.entity';
import { CostEntryHistory } from './cost-entry-history.entity';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * CostEntry Entity
 *
 * Main cost tracking entity that records all project costs.
 * Cost entries represent actual costs incurred on a project and are used
 * to track spending against the budget.
 *
 * Features:
 * - Multiple cost types (labor, material, equipment, subcontract, etc.)
 * - Lifecycle workflow (DRAFT → POSTED → VOID)
 * - Auto-generated entry numbers (CE-2025-00001)
 * - Comprehensive audit trail via history
 * - Integration with commitments and payment applications
 * - Cost period tracking for monthly/period reporting
 * - Void/reversal capability with reason tracking
 *
 * @entity cost_entries
 */
@Entity('cost_entries')
@Index('IDX_cost_entry_project', ['projectId'])
@Index('IDX_cost_entry_budget', ['budgetId'])
@Index('IDX_cost_entry_cost_code', ['costCodeId'])
@Index('IDX_cost_entry_type', ['type'])
@Index('IDX_cost_entry_status', ['status'])
@Index('IDX_cost_entry_date', ['entryDate'])
@Index('IDX_cost_entry_commitment', ['commitmentId'])
@Index('IDX_cost_entry_payment_app', ['paymentApplicationId'])
@Index('IDX_cost_entry_period', ['costPeriodId'])
@Index('IDX_cost_entry_number', ['entryNumber'], { unique: true })
export class CostEntry {
  /**
   * Unique identifier for the cost entry (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== IDENTIFICATION ====================

  /**
   * Auto-generated entry number (e.g., CE-2025-00001)
   * Format: CE-{YEAR}-{5-digit-sequence}
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'entry_number',
    nullable: false,
  })
  entryNumber!: string;

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

  /**
   * Cost Code ID
   */
  @Column({
    type: 'uuid',
    name: 'cost_code_id',
    nullable: false,
  })
  costCodeId!: string;

  // ==================== OPTIONAL REFERENCES ====================

  /**
   * Commitment ID (optional - links to subcontract/PO if applicable)
   */
  @Column({
    type: 'uuid',
    name: 'commitment_id',
    nullable: true,
  })
  commitmentId?: string;

  /**
   * Payment Application ID (optional - if cost from payment app)
   */
  @Column({
    type: 'uuid',
    name: 'payment_application_id',
    nullable: true,
  })
  paymentApplicationId?: string;

  /**
   * Cost Period ID (optional - for period-based reporting)
   */
  @Column({
    type: 'uuid',
    name: 'cost_period_id',
    nullable: true,
  })
  costPeriodId?: string;

  // ==================== COST ENTRY DETAILS ====================

  /**
   * Type of cost entry
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  type!: CostEntryType;

  /**
   * Status of cost entry
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CostEntryStatus.DRAFT,
  })
  status!: CostEntryStatus;

  /**
   * Date of the cost entry
   */
  @Column({
    type: 'date',
    name: 'entry_date',
    nullable: false,
  })
  entryDate!: Date;

  /**
   * Description of the cost
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  description!: string;

  // ==================== FINANCIAL DETAILS ====================

  /**
   * Quantity (optional - for unit-based costs)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  quantity?: number;

  /**
   * Unit cost (optional - for unit-based costs)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'unit_cost',
    nullable: true,
  })
  unitCost?: number;

  /**
   * Total cost (required)
   * This is the actual cost that affects the budget
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'total_cost',
    nullable: false,
  })
  totalCost!: number;

  // ==================== VENDOR/INVOICE DETAILS ====================

  /**
   * Vendor name (optional)
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  vendor?: string;

  /**
   * Invoice number (optional)
   */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'invoice_number',
    nullable: true,
  })
  invoiceNumber?: string;

  // ==================== POSTING WORKFLOW ====================

  /**
   * Timestamp when cost entry was posted to budget
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'posted_at',
    nullable: true,
  })
  postedAt?: Date;

  /**
   * User ID who posted the cost entry
   */
  @Column({
    type: 'uuid',
    name: 'posted_by_id',
    nullable: true,
  })
  postedById?: string;

  // ==================== VOID/REVERSAL ====================

  /**
   * Timestamp when cost entry was voided
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'voided_at',
    nullable: true,
  })
  voidedAt?: Date;

  /**
   * User ID who voided the cost entry
   */
  @Column({
    type: 'uuid',
    name: 'voided_by_id',
    nullable: true,
  })
  voidedById?: string;

  /**
   * Reason for voiding the entry
   */
  @Column({
    type: 'text',
    name: 'void_reason',
    nullable: true,
  })
  voidReason?: string;

  // ==================== ADDITIONAL NOTES ====================

  /**
   * Additional notes or comments
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  // ==================== AUDIT FIELDS ====================

  /**
   * User ID who created the cost entry
   */
  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: false,
  })
  createdById!: string;

  /**
   * Timestamp when the cost entry was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the cost entry was last updated
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
   * Cost Code relationship
   */
  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'cost_code_id' })
  costCode!: CostCode;

  /**
   * Commitment relationship (optional)
   */
  @ManyToOne(() => Commitment, { nullable: true })
  @JoinColumn({ name: 'commitment_id' })
  commitment?: Commitment;

  /**
   * Payment Application relationship (optional)
   */
  @ManyToOne(() => PaymentApplication, { nullable: true })
  @JoinColumn({ name: 'payment_application_id' })
  paymentApplication?: PaymentApplication;

  /**
   * Cost Period relationship (optional)
   */
  @ManyToOne(() => CostPeriod, { nullable: true })
  @JoinColumn({ name: 'cost_period_id' })
  costPeriod?: CostPeriod;

  /**
   * Created by user
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  /**
   * Posted by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'posted_by_id' })
  postedBy?: User;

  /**
   * Voided by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy?: User;

  /**
   * Cost entry history (audit trail)
   */
  @OneToMany(() => CostEntryHistory, (history) => history.costEntry)
  history?: CostEntryHistory[];

  // ==================== HOOKS ====================

  /**
   * Generate entry number before insert
   * Format: CE-{YEAR}-{5-digit-random}
   */
  @BeforeInsert()
  generateEntryNumber() {
    if (!this.entryNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 100000);
      this.entryNumber = `CE-${year}-${String(random).padStart(5, '0')}`;
    }
  }
}
