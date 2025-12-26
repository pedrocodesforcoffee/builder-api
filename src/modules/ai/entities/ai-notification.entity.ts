import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Recommendation } from './recommendation.entity';
import { User } from '../../users/entities/user.entity';

export enum AiNotificationType {
  RECOMMENDATION_CREATED = 'RECOMMENDATION_CREATED',
  RECOMMENDATION_HIGH_PRIORITY = 'RECOMMENDATION_HIGH_PRIORITY',
  RECOMMENDATION_ACCEPTED = 'RECOMMENDATION_ACCEPTED',
  RECOMMENDATION_REJECTED = 'RECOMMENDATION_REJECTED',
  RECOMMENDATION_REMINDER = 'RECOMMENDATION_REMINDER',
  PATTERN_ALERT = 'PATTERN_ALERT',
  RISK_DETECTED = 'RISK_DETECTED',
  SIMILAR_PROJECT_FOUND = 'SIMILAR_PROJECT_FOUND',
  LESSON_LEARNED_DRAFT = 'LESSON_LEARNED_DRAFT',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

@Entity('ai_notifications')
@Index(['userId', 'status', 'createdAt'])
@Index(['recommendationId', 'notificationType'])
export class AiNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'recommendationId', nullable: true })
  recommendationId: string | null;

  @ManyToOne(() => Recommendation, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'recommendationId' })
  recommendation: Recommendation | null;

  @Column({ type: 'uuid', name: 'userId' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AiNotificationType,
  })
  notificationType: AiNotificationType;

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
    projectId?: string;
    projectName?: string;
    organizationId?: string;
    recommendationType?: string;
    priority?: string;
    actionRequired?: boolean;
    [key: string]: any;
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
