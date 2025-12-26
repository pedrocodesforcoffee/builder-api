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
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Budget } from './budget.entity';
import { CostCode } from './cost-code.entity';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * BudgetLineItem Entity
 *
 * Represents a single line item within a budget, mapped to a cost code.
 * Each line item defines the budgeted cost for a specific scope of work
 * or cost category.
 *
 * Features:
 * - Mapped to hierarchical cost codes
 * - Categorized by cost type (labor, material, etc.)
 * - Supports unit-based budgeting (quantity × unit cost)
 * - Direct cost entry (budgeted cost)
 * - Optional descriptions for clarity
 *
 * @entity budget_line_items
 */
@Entity('budget_line_items')
@Index('IDX_budget_line_items_budget', ['budgetId'])
@Index('IDX_budget_line_items_cost_code', ['costCodeId'])
@Index('IDX_budget_line_items_category', ['category'])
export class BudgetLineItem {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the budget line item (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Budget ID
   * The budget this line item belongs to
   */
  @Column({
    type: 'uuid',
    name: 'budget_id',
    nullable: false,
  })
  budgetId!: string;

  /**
   * Cost code ID
   * The cost code this line item is assigned to
   * Enables hierarchical cost tracking and reporting
   */
  @Column({
    type: 'uuid',
    name: 'cost_code_id',
    nullable: false,
  })
  costCodeId!: string;

  /**
   * Budget category
   * Primary classification of the cost type
   *
   * Categories:
   * - LABOR: Direct labor costs
   * - MATERIAL: Material and supply costs
   * - EQUIPMENT: Equipment rental or owned equipment costs
   * - SUBCONTRACT: Subcontractor costs
   * - OTHER: Other costs (permits, insurance, etc.)
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  category!: BudgetCategory;

  /**
   * Line item description (optional)
   * Additional details about this specific budget item
   *
   * Examples:
   * - "Concrete formwork labor - 2nd floor"
   * - "Rebar material #4 @ 12\" o.c."
   * - "Excavation equipment rental"
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Quantity (optional)
   * The quantity of units for unit-based budgeting
   * If provided with unitCost, budgetedCost can be auto-calculated
   *
   * Examples:
   * - 1500 (sq ft)
   * - 240 (hours)
   * - 50 (cubic yards)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
  })
  quantity?: number;

  /**
   * Unit cost (optional)
   * Cost per unit for unit-based budgeting
   * If provided with quantity, budgetedCost can be auto-calculated
   *
   * Examples:
   * - 12.50 ($/sq ft)
   * - 65.00 ($/hour)
   * - 125.00 ($/cubic yard)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    name: 'unit_cost',
    nullable: true,
  })
  unitCost?: number;

  /**
   * Budgeted cost
   * The total budgeted amount for this line item
   *
   * Can be:
   * 1. Manually entered (direct cost entry)
   * 2. Calculated from quantity × unitCost
   *
   * Required field - every line item must have a budgeted cost
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'budgeted_cost',
    nullable: false,
  })
  budgetedCost!: number;

  /**
   * Committed cost
   * The total committed cost for this line item from commitments/subcontracts
   * Updated when commitment change orders (CCOs) are approved
   *
   * This represents contractual obligations before actual costs are incurred
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
   * Actual cost
   * The total actual cost incurred for this line item
   * Updated from approved payment applications via cost code mapping
   *
   * This tracks real costs against the budget for variance analysis
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
   * Timestamp when the line item was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the line item was last updated
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

  // ==================== RELATIONSHIPS ====================

  /**
   * Budget relationship
   * Links to the budget this line item belongs to
   */
  @ManyToOne(() => Budget, (budget) => budget.lineItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  /**
   * Cost code relationship
   * Links to the cost code for this line item
   */
  @ManyToOne(() => CostCode, { nullable: false })
  @JoinColumn({ name: 'cost_code_id' })
  costCode!: CostCode;

  // ==================== COMPUTED FIELDS & HOOKS ====================

  /**
   * Before insert/update hook
   * Validates data and auto-calculates budgeted cost if applicable
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateAndCompute() {
    // Auto-calculate budgeted cost from quantity and unit cost if both are provided
    if (
      this.quantity !== null &&
      this.quantity !== undefined &&
      this.unitCost !== null &&
      this.unitCost !== undefined &&
      (!this.budgetedCost || this.budgetedCost === 0)
    ) {
      this.budgetedCost = Number(this.quantity) * Number(this.unitCost);
    }

    // Validate that budgeted cost is provided
    if (this.budgetedCost === null || this.budgetedCost === undefined) {
      throw new Error('Budgeted cost is required');
    }

    // Validate positive costs
    if (Number(this.budgetedCost) < 0) {
      throw new Error('Budgeted cost must be positive');
    }

    if (
      this.quantity !== null &&
      this.quantity !== undefined &&
      Number(this.quantity) < 0
    ) {
      throw new Error('Quantity must be positive');
    }

    if (
      this.unitCost !== null &&
      this.unitCost !== undefined &&
      Number(this.unitCost) < 0
    ) {
      throw new Error('Unit cost must be positive');
    }
  }
}
