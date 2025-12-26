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

export enum SubmittalNotificationType {
  SUBMITTAL_CREATED = 'SUBMITTAL_CREATED',
  SUBMITTAL_SUBMITTED = 'SUBMITTAL_SUBMITTED',
  SUBMITTAL_RECEIVED = 'SUBMITTAL_RECEIVED',
  REVIEW_ASSIGNED = 'REVIEW_ASSIGNED',
  REVIEW_REMINDER = 'REVIEW_REMINDER',
  REVIEW_OVERDUE = 'REVIEW_OVERDUE',
  SUBMITTAL_APPROVED = 'SUBMITTAL_APPROVED',
  SUBMITTAL_APPROVED_AS_NOTED = 'SUBMITTAL_APPROVED_AS_NOTED',
  SUBMITTAL_REJECTED = 'SUBMITTAL_REJECTED',
  REVISE_RESUBMIT = 'REVISE_RESUBMIT',
  REVISION_SUBMITTED = 'REVISION_SUBMITTED',
  SUBMITTAL_DISTRIBUTED = 'SUBMITTAL_DISTRIBUTED',
  SUBMITTAL_CLOSED = 'SUBMITTAL_CLOSED',
  LEAD_TIME_WARNING = 'LEAD_TIME_WARNING',
  WORKFLOW_STEP_ACTIVE = 'WORKFLOW_STEP_ACTIVE',
  WORKFLOW_STEP_COMPLETE = 'WORKFLOW_STEP_COMPLETE',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

@Entity('submittal_notifications')
@Index(['userId', 'status', 'createdAt'])
@Index(['submittalId', 'notificationType'])
export class SubmittalNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'submittalId' })
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  @Column({ type: 'uuid', name: 'userId' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: SubmittalNotificationType,
  })
  notificationType: SubmittalNotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  bodyHtml: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deepLink: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    submittalNumber?: string;
    projectName?: string;
    revisionNumber?: number;
    stepName?: string;
    actionRequired?: boolean;
  };

  @Column({ type: 'timestamp with time zone', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
