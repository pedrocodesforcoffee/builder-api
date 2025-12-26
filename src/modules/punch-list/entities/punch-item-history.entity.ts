import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PunchItem } from './punch-item.entity';

/**
 * Action types for history tracking
 */
export enum HistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  COMMENTED = 'COMMENTED',
  PHOTO_ADDED = 'PHOTO_ADDED',
  PHOTO_REMOVED = 'PHOTO_REMOVED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  BALL_IN_COURT_CHANGED = 'BALL_IN_COURT_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  COMPLETED = 'COMPLETED',
  REOPENED = 'REOPENED',
}

/**
 * PunchItemHistory entity - Audit trail for punch item changes
 * Tracks all modifications, status changes, and actions taken on punch items
 *
 * Provides complete history for:
 * - Status workflow transitions
 * - Field updates
 * - Comments and notes
 * - Assignment changes
 * - Photo additions/removals
 */
@Entity('punch_item_history')
@Index(['punchItemId', 'createdAt'])
@Index(['punchItemId', 'action'])
export class PunchItemHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'punchItemId' })
  punchItemId: string;

  @ManyToOne(() => PunchItem, (punchItem) => punchItem.history, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'punchItemId' })
  punchItem: PunchItem;

  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action: HistoryAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  /**
   * Change tracking - stores old and new values for field changes
   */
  @Column({ type: 'jsonb', nullable: true })
  changes: {
    field?: string;
    oldValue?: any;
    newValue?: any;
  };

  /**
   * Additional metadata for the history entry
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source?: string; // web, mobile, api, etc.
    [key: string]: any;
  };

  /**
   * Audit fields
   */
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'createdAt' })
  createdAt: Date;
}
