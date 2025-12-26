import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CoAction } from '../enums/co-action.enum';

/**
 * ChangeOrderHistory Entity
 *
 * Comprehensive audit trail for all change order types (PCO/OCO/CCO/PACKAGE).
 * Tracks every action, status change, and modification across the change order lifecycle.
 *
 * Features:
 * - Universal tracking for all CO types via polymorphic changeOrderId + changeOrderType
 * - Action-based tracking (created, updated, approved, rejected, etc.)
 * - Status transition tracking (previousStatus → newStatus)
 * - JSON field for detailed change tracking (what changed, old vs new values)
 * - User attribution (who performed the action)
 * - Timestamped audit trail
 *
 * Use Cases:
 * - Full audit compliance
 * - Change order workflow tracking
 * - Dispute resolution
 * - Performance analytics
 * - Compliance reporting
 *
 * @entity change_order_history
 */
@Entity('change_order_history')
@Index('IDX_co_history_change_order', ['changeOrderId', 'changeOrderType'])
@Index('IDX_co_history_action', ['action'])
@Index('IDX_co_history_performed_by', ['performedBy'])
@Index('IDX_co_history_performed_at', ['performedAt'])
@Index('IDX_co_history_composite', ['changeOrderId', 'changeOrderType', 'performedAt'])
export class ChangeOrderHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== CHANGE ORDER REFERENCE ====================

  @Column({ type: 'uuid', name: 'change_order_id', nullable: false })
  changeOrderId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'change_order_type',
    nullable: false,
  })
  changeOrderType!: 'PCO' | 'OCO' | 'CCO' | 'PACKAGE';

  // ==================== ACTION TRACKING ====================

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  action!: CoAction;

  // ==================== STATUS TRANSITIONS ====================

  @Column({
    type: 'varchar',
    length: 50,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus?: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'new_status',
    nullable: true,
  })
  newStatus?: string;

  // ==================== CHANGE DETAILS ====================

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Detailed change information: field changes, old/new values, metadata',
  })
  changes?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== AUDIT ====================

  @Column({ type: 'uuid', name: 'performed_by', nullable: false })
  performedBy!: string;

  @CreateDateColumn({ name: 'performed_at', type: 'timestamp with time zone' })
  performedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performed_by' })
  performedByUser!: User;
}
