import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Budget } from './budget.entity';
import { CostEntry } from './cost-entry.entity';
import { Accrual } from './accrual.entity';
import { CostPeriodStatus } from '../enums/cost-period-status.enum';

/**
 * CostPeriod Entity
 *
 * Represents a monthly or custom cost tracking period for organizing
 * and reporting costs. Cost periods enable period-over-period analysis
 * and facilitate month-end closing processes.
 *
 * Features:
 * - Define custom reporting periods (typically monthly)
 * - Period lifecycle: OPEN → CLOSED → LOCKED
 * - Close periods to prevent further cost entries
 * - Lock periods for auditing/compliance (prevents reopening)
 * - Store budget snapshot when period is closed
 * - Track cost entries and accruals within period
 * - Unique constraint on (projectId, periodStart) to prevent duplicates
 *
 * @entity cost_periods
 */
@Entity('cost_periods')
@Index('IDX_cost_period_project', ['projectId'])
@Index('IDX_cost_period_budget', ['budgetId'])
@Index('IDX_cost_period_status', ['status'])
@Index('IDX_cost_period_start', ['periodStart'])
@Unique('UQ_cost_period_project_start', ['projectId', 'periodStart'])
export class CostPeriod {
  /**
   * Unique identifier for the cost period (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== IDENTIFICATION ====================

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

  // ==================== PERIOD DETAILS ====================

  /**
   * Period name (e.g., "January 2025", "Q1 2025")
   */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'period_name',
    nullable: false,
  })
  periodName!: string;

  /**
   * Period start date
   */
  @Column({
    type: 'date',
    name: 'period_start',
    nullable: false,
  })
  periodStart!: Date;

  /**
   * Period end date
   */
  @Column({
    type: 'date',
    name: 'period_end',
    nullable: false,
  })
  periodEnd!: Date;

  /**
   * Status of the cost period
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CostPeriodStatus.OPEN,
  })
  status!: CostPeriodStatus;

  // ==================== CLOSING WORKFLOW ====================

  /**
   * Timestamp when period was closed
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'closed_at',
    nullable: true,
  })
  closedAt?: Date;

  /**
   * User ID who closed the period
   */
  @Column({
    type: 'uuid',
    name: 'closed_by_id',
    nullable: true,
  })
  closedById?: string;

  // ==================== LOCKING WORKFLOW ====================

  /**
   * Timestamp when period was locked
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'locked_at',
    nullable: true,
  })
  lockedAt?: Date;

  /**
   * User ID who locked the period
   */
  @Column({
    type: 'uuid',
    name: 'locked_by_id',
    nullable: true,
  })
  lockedById?: string;

  // ==================== SNAPSHOT DATA ====================

  /**
   * Budget snapshot data when period is closed
   * Stores a JSON snapshot of budget state at close time for historical reporting
   * Example structure:
   * {
   *   "totalBudget": 1000000,
   *   "actualCost": 850000,
   *   "committedCost": 900000,
   *   "variance": 100000,
   *   "costCodes": [
   *     {
   *       "code": "01.100",
   *       "name": "Site Work",
   *       "budgeted": 50000,
   *       "actual": 48000,
   *       "committed": 49000
   *     }
   *   ]
   * }
   */
  @Column({
    type: 'jsonb',
    name: 'snapshot_data',
    nullable: true,
  })
  snapshotData?: Record<string, any>;

  // ==================== AUDIT FIELDS ====================

  /**
   * Timestamp when the cost period was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the cost period was last updated
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
   * Closed by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy?: User;

  /**
   * Locked by user (optional)
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'locked_by_id' })
  lockedBy?: User;

  /**
   * Cost entries within this period
   */
  @OneToMany(() => CostEntry, (entry) => entry.costPeriod)
  costEntries?: CostEntry[];

  /**
   * Accruals within this period
   */
  @OneToMany(() => Accrual, (accrual) => accrual.costPeriod)
  accruals?: Accrual[];
}
