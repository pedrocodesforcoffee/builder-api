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
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum SnapshotType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum SnapshotCategory {
  RFI = 'RFI',
  SUBMITTAL = 'SUBMITTAL',
  COMBINED = 'COMBINED',
}

@Entity('analytics_snapshots')
@Index(['projectId', 'snapshotDate', 'category'])
@Index(['organizationId', 'snapshotDate', 'snapshotType'])
export class AnalyticsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({
    type: 'enum',
    enum: SnapshotType,
  })
  snapshotType: SnapshotType;

  @Column({
    type: 'enum',
    enum: SnapshotCategory,
  })
  category: SnapshotCategory;

  @Column({ type: 'date' })
  snapshotDate: Date;

  // RFI Metrics
  @Column({ type: 'jsonb', nullable: true })
  rfiMetrics: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byDiscipline: Record<string, number>;
    open: number;
    closed: number;
    overdue: number;
    avgResponseDays: number;
    medianResponseDays: number;
    totalCostImpact: number;
    totalScheduleImpactDays: number;
    createdThisPeriod: number;
    closedThisPeriod: number;
    ballInCourtDistribution: Record<string, number>;
  };

  // Submittal Metrics
  @Column({ type: 'jsonb', nullable: true })
  submittalMetrics: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySpecDivision: Record<string, number>;
    approved: number;
    approvedAsNoted: number;
    rejected: number;
    pending: number;
    overdue: number;
    avgReviewDays: number;
    medianReviewDays: number;
    firstTimeApprovalRate: number;
    avgRevisionsPerSubmittal: number;
    createdThisPeriod: number;
    approvedThisPeriod: number;
  };

  // Combined/Summary Metrics
  @Column({ type: 'jsonb', nullable: true })
  summaryMetrics: {
    totalOpenItems: number;
    totalOverdueItems: number;
    overallHealthScore: number; // 0-100
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    topBottlenecks: Array<{
      type: 'USER' | 'COMPANY' | 'DISCIPLINE';
      id: string;
      name: string;
      itemCount: number;
      avgDaysOverdue: number;
    }>;
  };

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
