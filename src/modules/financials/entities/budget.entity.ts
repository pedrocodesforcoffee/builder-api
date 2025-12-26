import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetLineItem } from './budget-line-item.entity';

/**
 * Budget Entity
 *
 * Represents a project budget with line items organized by cost codes.
 * Budgets track planned costs across different categories and cost codes,
 * enabling comparison against actual costs for project financial management.
 *
 * Features:
 * - Multiple budgets per project (original, revised, forecast, etc.)
 * - Status workflow (draft → active → locked/archived)
 * - Computed total from budget line items
 * - Audit trail (created by, timestamps)
 *
 * @entity budgets
 */
@Entity('budgets')
@Index('IDX_budgets_project', ['projectId'])
@Index('IDX_budgets_status', ['status'])
@Index('IDX_budgets_created_by', ['createdById'])
export class Budget {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the budget (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID
   * The project this budget belongs to
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Budget name
   * Descriptive name for this budget
   *
   * Examples:
   * - "Original Budget"
   * - "Revised Budget - March 2024"
   * - "Forecast Budget Q2"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * Budget description (optional)
   * Additional details about this budget and its purpose
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Budget status
   * Controls the lifecycle and editability of the budget
   *
   * - DRAFT: Budget is being created/edited
   * - ACTIVE: Budget is active and being tracked
   * - LOCKED: Budget is locked for period close or review
   * - ARCHIVED: Budget is archived and no longer active
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: BudgetStatus.DRAFT,
  })
  status!: BudgetStatus;

  /**
   * Total budgeted cost
   * Sum of all budget line items
   * This is a computed field that should be calculated from line items
   *
   * Note: In a production system, this could be:
   * 1. A virtual computed column (PostgreSQL generated column)
   * 2. Calculated on-the-fly in queries
   * 3. Cached and updated via triggers or application logic
   *
   * For now, this is updated by the service layer when line items change
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_budget',
    nullable: false,
    default: 0,
  })
  totalBudget!: number;

  /**
   * Contingency/reserve funds
   * Buffer funds available to absorb change orders or unforeseen costs
   * Can be reduced when Owner Change Orders (OCOs) are approved with CONTINGENCY impact type
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  contingency!: number;

  // ==================== AUDIT FIELDS ====================

  /**
   * User ID who created this budget
   */
  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: false,
  })
  createdById!: string;

  /**
   * Timestamp when the budget was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the budget was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  /**
   * Version number for optimistic locking
   * Automatically incremented by TypeORM on each update
   * Used to detect concurrent modifications
   */
  @VersionColumn()
  version!: number;

  /**
   * User ID who has locked this budget (optional)
   * When set, only this user can modify the budget
   * Null means the budget is not locked
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'locked_by_id',
  })
  lockedById?: string;

  /**
   * Timestamp when the budget was locked
   * Used to implement automatic lock expiration
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'locked_at',
  })
  lockedAt?: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Project relationship
   * Links to the project this budget belongs to
   */
  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Created by relationship
   * Links to the user who created this budget
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  /**
   * Locked by relationship
   * Links to the user who has locked this budget
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'locked_by_id' })
  lockedBy?: User;

  /**
   * Budget line items
   * All line items that belong to this budget
   */
  @OneToMany(() => BudgetLineItem, (lineItem) => lineItem.budget)
  lineItems?: BudgetLineItem[];
}
