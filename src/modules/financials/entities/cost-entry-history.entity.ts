import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CostEntry } from './cost-entry.entity';
import { CostEntryAction } from '../enums/cost-entry-action.enum';

/**
 * CostEntryHistory Entity
 *
 * Provides comprehensive audit trail for all cost entry changes.
 * Records every action performed on a cost entry including creation,
 * updates, posting, voiding, transfers, and conversions.
 *
 * Features:
 * - Complete audit trail for cost entries
 * - Tracks action type and performer
 * - Stores before/after state changes in JSONB
 * - Records IP address and user agent for security
 * - Chronological ordering by performedAt timestamp
 * - Links back to parent cost entry
 *
 * @entity cost_entry_history
 */
@Entity('cost_entry_history')
@Index('IDX_cost_entry_history_entry', ['costEntryId'])
@Index('IDX_cost_entry_history_performed_at', ['performedAt'])
@Index('IDX_cost_entry_history_action', ['action'])
export class CostEntryHistory {
  /**
   * Unique identifier for the history record (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== IDENTIFICATION ====================

  /**
   * Cost Entry ID that this history record belongs to
   */
  @Column({
    type: 'uuid',
    name: 'cost_entry_id',
    nullable: false,
  })
  costEntryId!: string;

  // ==================== ACTION DETAILS ====================

  /**
   * Type of action performed
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  action!: CostEntryAction;

  /**
   * User ID who performed the action
   */
  @Column({
    type: 'uuid',
    name: 'performed_by_id',
    nullable: false,
  })
  performedById!: string;

  /**
   * Timestamp when action was performed
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'performed_at',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  performedAt!: Date;

  // ==================== CHANGE TRACKING ====================

  /**
   * Changes made to the cost entry
   * Stores before/after values for modified fields
   * Example structure:
   * {
   *   "before": {
   *     "totalCost": 1000.00,
   *     "status": "DRAFT",
   *     "description": "Old description"
   *   },
   *   "after": {
   *     "totalCost": 1200.00,
   *     "status": "POSTED",
   *     "description": "Updated description"
   *   },
   *   "fieldsChanged": ["totalCost", "status", "description"]
   * }
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  changes?: Record<string, any>;

  /**
   * Additional notes or comments about the action
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  // ==================== SECURITY/AUDIT METADATA ====================

  /**
   * IP address of the user who performed the action
   */
  @Column({
    type: 'varchar',
    length: 45,
    name: 'ip_address',
    nullable: true,
  })
  ipAddress?: string;

  /**
   * User agent (browser/client) of the user who performed the action
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'user_agent',
    nullable: true,
  })
  userAgent?: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * Cost Entry relationship
   */
  @ManyToOne(() => CostEntry, (entry) => entry.history, { nullable: false })
  @JoinColumn({ name: 'cost_entry_id' })
  costEntry!: CostEntry;

  /**
   * Performed by user
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy!: User;
}
