import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Budget } from './budget.entity';
import { User } from '../../users/entities/user.entity';

/**
 * BudgetSnapshot Entity
 *
 * Represents a point-in-time snapshot of a budget and its line items.
 * Snapshots preserve the complete budget state at a specific moment,
 * enabling historical comparison and audit trails.
 *
 * Features:
 * - Immutable historical records
 * - Complete budget + line items stored in JSONB
 * - Summary calculations for quick access
 * - Named snapshots for easy reference (e.g., "Month End - January 2024")
 *
 * Use cases:
 * - Period-end budget preservation
 * - Before/after comparison for major changes
 * - Audit trail and compliance
 * - Historical trend analysis
 *
 * @entity budget_snapshots
 */
@Entity('budget_snapshots')
@Index('IDX_budget_snapshots_budget', ['budgetId'])
@Index('IDX_budget_snapshots_created_by', ['createdById'])
@Index('IDX_budget_snapshots_created_at', ['createdAt'])
export class BudgetSnapshot {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the snapshot (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Budget ID
   * The budget this snapshot belongs to
   */
  @Column({
    type: 'uuid',
    name: 'budget_id',
    nullable: false,
  })
  budgetId!: string;

  /**
   * Snapshot name
   * Descriptive name for this snapshot
   *
   * Examples:
   * - "Month End - January 2024"
   * - "Pre-Change Order #123"
   * - "Year End 2023"
   * - "Budget Review - Q2"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * Snapshot description (optional)
   * Additional context about why this snapshot was created
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  // ==================== SNAPSHOT DATA ====================

  /**
   * Complete snapshot data (JSONB)
   * Contains the full budget object and all line items at the time of snapshot
   *
   * Structure:
   * {
   *   budget: { ...budget fields... },
   *   lineItems: [
   *     { ...line item 1... },
   *     { ...line item 2... },
   *     ...
   *   ]
   * }
   *
   * This allows complete reconstruction of the budget state at snapshot time
   */
  @Column({
    type: 'jsonb',
    name: 'snapshot_data',
    nullable: false,
  })
  snapshotData!: {
    budget: Record<string, any>;
    lineItems: Record<string, any>[];
  };

  // ==================== SUMMARY FIELDS ====================
  // These are denormalized for quick access and reporting without parsing JSONB

  /**
   * Original budget amount at snapshot time
   * The initial budgeted cost before any revisions
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'original_amount',
    nullable: false,
  })
  originalAmount!: number;

  /**
   * Revised budget amount at snapshot time
   * The current total budgeted cost (sum of all line items)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'revised_amount',
    nullable: false,
  })
  revisedAmount!: number;

  /**
   * Committed cost at snapshot time
   * Total amount committed via purchase orders and contracts
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'committed_cost',
    nullable: false,
    default: 0,
  })
  committedCost!: number;

  /**
   * Actual cost at snapshot time
   * Total amount actually spent (from invoices and expenses)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'actual_cost',
    nullable: false,
    default: 0,
  })
  actualCost!: number;

  // ==================== AUDIT FIELDS ====================

  /**
   * User ID who created this snapshot
   */
  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: false,
  })
  createdById!: string;

  /**
   * Timestamp when the snapshot was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Budget relationship
   * Links to the budget this snapshot belongs to
   */
  @ManyToOne(() => Budget, { nullable: false })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  /**
   * Created by relationship
   * Links to the user who created this snapshot
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;
}
