import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Budget } from './budget.entity';
import { BudgetLineItem } from './budget-line-item.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Budget Audit Log Entity
 *
 * Tracks all changes to budgets and budget line items for compliance and historical analysis.
 * Enables point-in-time snapshot reconstruction and comprehensive audit trails.
 *
 * Key Features:
 * - Complete before/after state capture in JSONB
 * - Action tracking (CREATE, UPDATE, DELETE, LOCK, UNLOCK, ACTIVATE, etc.)
 * - User and IP address tracking for security
 * - Support for both budget-level and line-item-level changes
 * - Optimized for time-based queries with indexed timestamp
 *
 * Compliance:
 * - SOX: Audit trail for financial data changes
 * - GDPR: Access logging and data modification tracking
 * - Internal: Complete change history for dispute resolution
 *
 * @entity BudgetAuditLog
 */
@Entity('budget_audit_logs')
@Index(['budgetId', 'timestamp'])
@Index(['lineItemId', 'timestamp'])
@Index(['userId', 'timestamp'])
export class BudgetAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Budget being audited
   * Required for all audit logs
   */
  @Column({ type: 'uuid', name: 'budget_id' })
  budgetId!: string;

  @ManyToOne(() => Budget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget?: Budget;

  /**
   * Line item being audited (optional)
   * Null for budget-level changes
   * Set for line item changes
   */
  @Column({ type: 'uuid', nullable: true, name: 'line_item_id' })
  lineItemId?: string;

  @ManyToOne(() => BudgetLineItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'line_item_id' })
  lineItem?: BudgetLineItem;

  /**
   * User who performed the action
   */
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /**
   * Action performed
   *
   * Budget Actions:
   * - CREATE: Budget created
   * - UPDATE: Budget fields modified
   * - DELETE: Budget deleted
   * - LOCK: Budget locked for editing
   * - UNLOCK: Budget unlocked
   * - ACTIVATE: Budget activated (status changed to ACTIVE)
   * - ARCHIVE: Budget archived
   * - REVISE: Budget revision created
   *
   * Line Item Actions:
   * - LINE_ITEM_CREATE: Line item added
   * - LINE_ITEM_UPDATE: Line item modified
   * - LINE_ITEM_DELETE: Line item removed
   * - BULK_IMPORT: Multiple line items imported
   */
  @Column({ type: 'varchar', length: 50 })
  action!: string;

  /**
   * State before change (JSONB)
   * Null for CREATE actions
   * Contains full object state for UPDATE/DELETE
   *
   * Example for budget update:
   * {
   *   "name": "Original Budget",
   *   "status": "DRAFT",
   *   "totalBudget": 100000.00
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  before?: any;

  /**
   * State after change (JSONB)
   * Null for DELETE actions
   * Contains full object state for CREATE/UPDATE
   *
   * Example for budget update:
   * {
   *   "name": "Revised Budget v2",
   *   "status": "ACTIVE",
   *   "totalBudget": 125000.00
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  after?: any;

  /**
   * Additional metadata (JSONB)
   * Context-specific information
   *
   * Example metadata:
   * {
   *   "reason": "Budget revision requested by client",
   *   "importFileName": "budget-import-2025-12.xlsx",
   *   "rowsImported": 150,
   *   "lockDuration": 3600
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  /**
   * Timestamp of the action
   * Indexed for efficient historical queries
   */
  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;

  /**
   * IP address of the user
   * For security and fraud detection
   */
  @Column({ type: 'inet', nullable: true, name: 'ip_address' })
  ipAddress?: string;

  /**
   * User agent string
   * Helps identify the client application
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string;

  /**
   * Entity type being audited
   * 'budget' or 'line_item'
   * Denormalized for easier querying
   */
  @Column({ type: 'varchar', length: 20, name: 'entity_type' })
  entityType!: string;

  /**
   * Changes summary (computed field)
   * JSON diff of before/after for quick reference
   * Format: { field: { old: value, new: value } }
   *
   * Example:
   * {
   *   "name": { "old": "Original Budget", "new": "Revised Budget" },
   *   "totalBudget": { "old": 100000.00, "new": 125000.00 }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  changes?: any;

  /**
   * Helper method to create a budget-level audit log entry
   */
  static createBudgetLog(params: {
    budgetId: string;
    userId: string;
    action: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Partial<BudgetAuditLog> {
    return {
      budgetId: params.budgetId,
      userId: params.userId,
      action: params.action,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      entityType: 'budget',
      changes: this.computeChanges(params.before, params.after),
    };
  }

  /**
   * Helper method to create a line-item-level audit log entry
   */
  static createLineItemLog(params: {
    budgetId: string;
    lineItemId: string;
    userId: string;
    action: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Partial<BudgetAuditLog> {
    return {
      budgetId: params.budgetId,
      lineItemId: params.lineItemId,
      userId: params.userId,
      action: params.action,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      entityType: 'line_item',
      changes: this.computeChanges(params.before, params.after),
    };
  }

  /**
   * Compute changes between before and after states
   * Returns a diff object with changed fields only
   */
  private static computeChanges(before: any, after: any): any {
    if (!before || !after) {
      return null;
    }

    const changes: any = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      // Skip metadata fields
      if (['createdAt', 'updatedAt', 'id'].includes(key)) {
        continue;
      }

      const oldValue = before[key];
      const newValue = after[key];

      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
