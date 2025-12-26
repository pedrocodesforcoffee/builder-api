import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertSeverity } from '../enums/alert-severity.enum';
import { AlertStatus } from '../enums/alert-status.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

/**
 * MetricAlert Entity
 *
 * Tracks alerts generated when metrics exceed defined thresholds.
 * Alerts can be acknowledged, resolved, or remain active.
 *
 * @entity metric_alerts
 */
@Entity('metric_alerts')
@Index('IDX_metric_alerts_project_status', ['projectId', 'status'])
@Index('IDX_metric_alerts_triggered', ['triggeredAt'])
@Index('IDX_metric_alerts_severity', ['severity'])
@Index('IDX_metric_alerts_metric', ['metric'])
export class MetricAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID this alert belongs to
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Metric name/identifier that triggered the alert
   * e.g., "schedule.variance", "budget.overrun", "safety.incidents"
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  metric!: string;

  /**
   * Alert severity level
   */
  @Column({
    type: 'enum',
    enum: AlertSeverity,
    nullable: false,
    default: AlertSeverity.WARNING,
  })
  severity!: AlertSeverity;

  /**
   * Human-readable alert message
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  message!: string;

  /**
   * Current value of the metric
   */
  @Column({
    type: 'jsonb',
    name: 'current_value',
    nullable: false,
  })
  currentValue!: any;

  /**
   * Threshold that was exceeded
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  threshold!: {
    condition: string; // 'gt', 'lt', 'gte', 'lte', 'eq', 'neq'
    value: any;
  };

  /**
   * Alert status
   */
  @Column({
    type: 'enum',
    enum: AlertStatus,
    nullable: false,
    default: AlertStatus.ACTIVE,
  })
  status!: AlertStatus;

  /**
   * When the alert was triggered
   */
  @Column({
    type: 'timestamp',
    name: 'triggered_at',
    nullable: false,
  })
  triggeredAt!: Date;

  /**
   * When the alert was resolved (if resolved)
   */
  @Column({
    type: 'timestamp',
    name: 'resolved_at',
    nullable: true,
  })
  resolvedAt?: Date;

  /**
   * User ID who acknowledged the alert
   */
  @Column({
    type: 'uuid',
    name: 'acknowledged_by',
    nullable: true,
  })
  acknowledgedBy?: string;

  /**
   * When the alert was acknowledged
   */
  @Column({
    type: 'timestamp',
    name: 'acknowledged_at',
    nullable: true,
  })
  acknowledgedAt?: Date;

  /**
   * Additional context and metadata
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  metadata!: {
    metricGroup?: string;
    previousValue?: any;
    changePercentage?: number;
    affectedPhase?: string;
    affectedMilestone?: string;
    recommendations?: string[];
    relatedAlerts?: string[];
    [key: string]: any;
  };

  /**
   * Number of times this alert has been triggered
   * (for recurring alerts)
   */
  @Column({
    type: 'integer',
    name: 'occurrence_count',
    nullable: false,
    default: 1,
  })
  occurrenceCount!: number;

  /**
   * Last time this alert was seen (for deduplication)
   */
  @Column({
    type: 'timestamp',
    name: 'last_seen_at',
    nullable: false,
  })
  lastSeenAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledger?: User;

  // Helper methods

  /**
   * Check if alert is active
   */
  isActive(): boolean {
    return this.status === AlertStatus.ACTIVE;
  }

  /**
   * Check if alert is critical
   */
  isCritical(): boolean {
    return this.severity === AlertSeverity.CRITICAL;
  }

  /**
   * Get duration of alert in hours
   */
  getDuration(): number {
    const end = this.resolvedAt || new Date();
    const start = this.triggeredAt;
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Check if alert is recurring
   */
  isRecurring(): boolean {
    return this.occurrenceCount > 1;
  }
}