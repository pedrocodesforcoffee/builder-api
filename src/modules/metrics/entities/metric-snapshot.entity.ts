import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

export enum SnapshotPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * MetricSnapshot Entity
 *
 * Stores historical snapshots of project metrics for trend analysis
 * and reporting. Snapshots are taken at regular intervals (daily, weekly, monthly).
 *
 * @entity metric_snapshots
 */
@Entity('metric_snapshots')
@Index('IDX_metric_snapshots_project_date', ['projectId', 'snapshotDate'])
@Index('IDX_metric_snapshots_project_period', ['projectId', 'period'])
@Index('IDX_metric_snapshots_date', ['snapshotDate'])
export class MetricSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID this snapshot belongs to
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Date of the snapshot
   */
  @Column({
    type: 'date',
    name: 'snapshot_date',
    nullable: false,
  })
  snapshotDate!: Date;

  /**
   * Complete metric data at time of snapshot
   * Includes all metric groups
   */
  @Column({
    type: 'jsonb',
    name: 'metric_data',
    nullable: false,
    default: {},
  })
  metricData!: Record<string, any>;

  /**
   * Period type for this snapshot
   */
  @Column({
    type: 'enum',
    enum: SnapshotPeriod,
    nullable: false,
    default: SnapshotPeriod.DAILY,
  })
  period!: SnapshotPeriod;

  /**
   * Key performance indicators at time of snapshot
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  kpis!: {
    schedulePerformanceIndex?: number;
    costPerformanceIndex?: number;
    percentComplete?: number;
    daysRemaining?: number;
    budgetVariance?: number;
    activeTeamMembers?: number;
    documentCount?: number;
    openRfis?: number;
    pendingSubmittals?: number;
    safetyIncidents?: number;
    qualityIssues?: number;
  };

  /**
   * Summary statistics
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  summary!: {
    totalAlerts?: number;
    criticalAlerts?: number;
    warningAlerts?: number;
    metricGroupsCalculated?: string[];
    calculationErrors?: string[];
  };

  /**
   * Additional metadata
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  metadata!: Record<string, any>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  // Helper methods

  /**
   * Get age of snapshot in days
   */
  getAge(): number {
    const today = new Date();
    const snapshot = new Date(this.snapshotDate);
    const diffTime = today.getTime() - snapshot.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if snapshot is for current period
   */
  isCurrentPeriod(): boolean {
    const today = new Date();
    const snapshot = new Date(this.snapshotDate);

    switch (this.period) {
      case SnapshotPeriod.DAILY:
        return today.toDateString() === snapshot.toDateString();
      case SnapshotPeriod.WEEKLY:
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return snapshot >= weekStart && snapshot <= weekEnd;
      case SnapshotPeriod.MONTHLY:
        return (
          today.getMonth() === snapshot.getMonth() &&
          today.getFullYear() === snapshot.getFullYear()
        );
      default:
        return false;
    }
  }
}