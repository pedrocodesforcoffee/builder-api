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
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('user_performance_metrics')
@Index(['userId', 'projectId', 'periodStart'])
@Index(['projectId', 'periodStart'])
export class UserPerformanceMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'userId' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', name: 'projectId', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', name: 'organizationId' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  // RFI Performance
  @Column({ type: 'jsonb' })
  rfiPerformance: {
    assigned: number;
    completed: number;
    overdue: number;
    avgResponseDays: number;
    onTimeRate: number; // percentage
    forwarded: number;
  };

  // Submittal Performance
  @Column({ type: 'jsonb' })
  submittalPerformance: {
    assignedReviews: number;
    completedReviews: number;
    overdueReviews: number;
    avgReviewDays: number;
    onTimeRate: number;
    approvalRate: number;
    reviseResubmitRate: number;
  };

  // Overall Score (0-100)
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  performanceScore: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
