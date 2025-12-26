import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Submittal } from './submittal.entity';
import { User } from '../../users/entities/user.entity';

export enum SubmittalHistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SUBMITTED = 'SUBMITTED',
  RECEIVED = 'RECEIVED',
  REVIEW_STARTED = 'REVIEW_STARTED',
  FORWARDED = 'FORWARDED',
  RESPONSE_ADDED = 'RESPONSE_ADDED',
  APPROVED = 'APPROVED',
  APPROVED_AS_NOTED = 'APPROVED_AS_NOTED',
  REVISE_RESUBMIT = 'REVISE_RESUBMIT',
  REJECTED = 'REJECTED',
  REVISION_CREATED = 'REVISION_CREATED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  VOIDED = 'VOIDED',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  ASSIGNEE_CHANGED = 'ASSIGNEE_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  DISTRIBUTED = 'DISTRIBUTED',
  COMMENT_ADDED = 'COMMENT_ADDED',
}

@Entity('submittal_history')
// Note: Indexes defined in migration
export class SubmittalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submittal, (submittal) => submittal.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  @RelationId((history: SubmittalHistory) => history.submittal)
  submittalId: string;

  @Column({
    type: 'enum',
    enum: SubmittalHistoryAction,
  })
  action: SubmittalHistoryAction;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @RelationId((history: SubmittalHistory) => history.performedBy)
  performedById: string;

  @Column({ type: 'text' })
  description: string;

  // Revision number at time of action
  @Column({ type: 'int', nullable: true })
  revisionNumber: number;

  // Change tracking
  @Column({ type: 'jsonb', nullable: true })
  previousValue: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, any>;

  // Related entity
  @Column({ type: 'uuid', nullable: true })
  relatedEntityId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relatedEntityType: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
