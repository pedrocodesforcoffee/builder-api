import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Rfi } from './rfi.entity';
import { User } from '../../users/entities/user.entity';

export enum RfiHistoryAction {
  CREATED = 'CREATED',
  OPENED = 'OPENED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  FORWARDED = 'FORWARDED',
  RESPONDED = 'RESPONDED',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  VOIDED = 'VOIDED',
  EDITED = 'EDITED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  DISTRIBUTION_UPDATED = 'DISTRIBUTION_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
}

@Entity('rfi_history')
@Index(['rfiId', 'createdAt'])
@Index(['performedById'])
export class RfiHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rfiId: string;

  @ManyToOne(() => Rfi, (rfi) => rfi.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfiId' })
  rfi: Rfi;

  @Column({
    type: 'enum',
    enum: RfiHistoryAction,
  })
  action: RfiHistoryAction;

  @Column({ type: 'uuid' })
  performedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  // Description of what changed
  @Column({ type: 'text' })
  description: string;

  // Previous and new values for tracking changes
  @Column({ type: 'jsonb', nullable: true })
  previousValue: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, any>;

  // Related entity (e.g., response ID, attachment ID)
  @Column({ type: 'uuid', nullable: true })
  relatedEntityId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relatedEntityType: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
