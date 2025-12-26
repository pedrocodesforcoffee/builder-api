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
import { Commitment } from './commitment.entity';
import { CostPeriod } from './cost-period.entity';
import { CostEntry } from './cost-entry.entity';
import { AccrualStatus } from '../enums/accrual-status.enum';

/**
 * Accrual Entity
 *
 * Represents unbilled cost accruals for estimated costs not yet invoiced.
 * Accruals are used to recognize costs that have been incurred but not yet
 * formally billed, providing more accurate budget tracking.
 *
 * Features:
 * - Track estimated unbilled costs
 * - Lifecycle: ACTIVE → REVERSED/CONVERTED/VOID
 * - Auto-generated accrual numbers (AC-2025-00001)
 * - Can be reversed when invoice arrives or estimate corrected
 * - Can be converted to actual cost entry when invoice received
 * - Integration with commitments and cost periods
 * - Links to converted cost entry for audit trail
 *
 * @entity accruals
 */
@Entity('accruals')
@Index('IDX_accrual_project', ['projectId'])
@Index('IDX_accrual_budget', ['budgetId'])
@Index('IDX_accrual_cost_code', ['costCodeId'])
@Index('IDX_accrual_status', ['status'])
@Index('IDX_accrual_date', ['accrualDate'])
@Index('IDX_accrual_period', ['costPeriodId'])
@Index('IDX_accrual_number', ['accrualNumber'], { unique: true })
export class Accrual {
  /**
   * Unique identifier for the accrual (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== IDENTIFICATION ====================

  /**
   * Auto-generated accrual number (e.g., AC-2025-00001)
   * Format: AC-{YEAR}-{5-digit-sequence}
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'accrual_number',
    nullable: false,
  })
  accrualNumber!: string;

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
   * Cost Period ID (optional - for period-based reporting)
   */
  @Column({
    type: 'uuid',
    name: 'cost_period_id',
    nullable: true,
  })
  costPeriodId?: string;

  // ==================== ACCRUAL DETAILS ====================

  /**
   * Description of the accrued cost
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  description!: string;

  /**
   * Estimated cost amount
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'estimated_cost',
    nullable: false,
  })
  estimatedCost!: number;

  /**
   * Status of the accrual
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: AccrualStatus.ACTIVE,
  })
  status!: AccrualStatus;

  /**
   * Date of the accrual
   */
  @Column({
    type: 'date',
    name: 'accrual_date',
    nullable: false,
  })
  accrualDate!: Date;

  // ==================== REVERSAL TRACKING ====================

  /**
   * Timestamp when accrual was reversed
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'reversed_at',
    nullable: true,
  })
  reversedAt?: Date;

  /**
   * User ID who reversed the accrual
   */
  @Column({
    type: 'uuid',
    name: 'reversed_by_id',
    nullable: true,
  })
  reversedById?: string;

  /**
   * Reason for reversing the accrual
   */
  @Column({
    type: 'text',
    name: 'reversal_reason',
    nullable: true,
  })
  reversalReason?: string;

  // ==================== CONVERSION TRACKING ====================

  /**
   * Cost Entry ID when accrual is converted to actual cost
   * References the cost entry created when invoice is received
   */
  @Column({
    type: 'uuid',
    name: 'converted_entry_id',
    nullable: true,
  })
  convertedEntryId?: string;

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
   * User ID who created the accrual
   */
  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: false,
  })
  createdById!: string;

  /**
   * Timestamp when the accrual was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the accrual was last updated
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
   * Reversed by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reversed_by_id' })
  reversedBy?: User;

  /**
   * Converted Cost Entry relationship (optional)
   * References the cost entry created when accrual is converted
   */
  @ManyToOne(() => CostEntry, { nullable: true })
  @JoinColumn({ name: 'converted_entry_id' })
  convertedEntry?: CostEntry;

  // ==================== HOOKS ====================

  /**
   * Generate accrual number before insert
   * Format: AC-{YEAR}-{5-digit-random}
   */
  @BeforeInsert()
  generateAccrualNumber() {
    if (!this.accrualNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 100000);
      this.accrualNumber = `AC-${year}-${String(random).padStart(5, '0')}`;
    }
  }
}
