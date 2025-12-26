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
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum ThresholdCondition {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'neq',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

/**
 * MetricThreshold Entity
 *
 * Defines threshold configurations for metric alerts.
 * Can be set at project level or organization level (defaults).
 *
 * @entity metric_thresholds
 */
@Entity('metric_thresholds')
@Index('IDX_metric_thresholds_project', ['projectId'])
@Index('IDX_metric_thresholds_organization', ['organizationId'])
@Index('IDX_metric_thresholds_metric', ['metric'])
@Index('IDX_metric_thresholds_enabled', ['enabled'])
export class MetricThreshold {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID (nullable for org-level thresholds)
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: true,
  })
  projectId?: string;

  /**
   * Organization ID for org-level defaults
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: false,
  })
  organizationId!: string;

  /**
   * Metric identifier
   * e.g., "schedule.variance", "budget.overrun", "safety.incidents"
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  metric!: string;

  /**
   * Display name for the threshold
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * Description of what this threshold monitors
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Condition for triggering alert
   */
  @Column({
    type: 'enum',
    enum: ThresholdCondition,
    nullable: false,
  })
  condition!: ThresholdCondition;

  /**
   * Threshold value
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  value!: any;

  /**
   * Unit of measurement (optional)
   * e.g., "days", "dollars", "percentage"
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  unit?: string;

  /**
   * Alert severity when threshold is exceeded
   */
  @Column({
    type: 'enum',
    enum: AlertSeverity,
    nullable: false,
    default: AlertSeverity.WARNING,
  })
  severity!: AlertSeverity;

  /**
   * Whether this threshold is enabled
   */
  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  enabled!: boolean;

  /**
   * Roles to notify when threshold is exceeded
   */
  @Column({
    type: 'simple-array',
    name: 'notify_roles',
    nullable: false,
    default: '',
  })
  notifyRoles!: string[];

  /**
   * Specific user IDs to notify
   */
  @Column({
    type: 'simple-array',
    name: 'notify_users',
    nullable: false,
    default: '',
  })
  notifyUsers!: string[];

  /**
   * Notification channels to use
   */
  @Column({
    type: 'simple-array',
    name: 'notification_channels',
    nullable: false,
    default: 'IN_APP',
  })
  notificationChannels!: NotificationChannel[];

  /**
   * Grace period in minutes before triggering alert
   * (to avoid flapping)
   */
  @Column({
    type: 'integer',
    name: 'grace_period_minutes',
    nullable: false,
    default: 0,
  })
  gracePeriodMinutes!: number;

  /**
   * Cooldown period in minutes before re-triggering
   */
  @Column({
    type: 'integer',
    name: 'cooldown_minutes',
    nullable: false,
    default: 60,
  })
  cooldownMinutes!: number;

  /**
   * Custom alert message template
   * Can include placeholders: {metric}, {value}, {threshold}, {project}
   */
  @Column({
    type: 'text',
    name: 'message_template',
    nullable: true,
  })
  messageTemplate?: string;

  /**
   * Additional configuration
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  metadata!: {
    category?: string;
    tags?: string[];
    aggregation?: string; // 'avg', 'sum', 'min', 'max', 'count'
    timeWindow?: number; // in minutes
    customLogic?: string;
    [key: string]: any;
  };

  /**
   * Priority order for evaluation (lower = higher priority)
   */
  @Column({
    type: 'integer',
    nullable: false,
    default: 100,
  })
  priority!: number;

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

  @Column({
    type: 'uuid',
    name: 'created_by',
    nullable: true,
  })
  createdBy?: string;

  @Column({
    type: 'uuid',
    name: 'updated_by',
    nullable: true,
  })
  updatedBy?: string;

  // Relationships
  @ManyToOne(() => Project, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  // Helper methods

  /**
   * Check if threshold applies to a specific project
   */
  appliesToProject(projectId: string): boolean {
    return !this.projectId || this.projectId === projectId;
  }

  /**
   * Check if value exceeds threshold
   */
  isExceeded(value: any): boolean {
    if (!this.enabled) return false;

    switch (this.condition) {
      case ThresholdCondition.GREATER_THAN:
        return value > this.value;
      case ThresholdCondition.LESS_THAN:
        return value < this.value;
      case ThresholdCondition.GREATER_THAN_OR_EQUAL:
        return value >= this.value;
      case ThresholdCondition.LESS_THAN_OR_EQUAL:
        return value <= this.value;
      case ThresholdCondition.EQUAL:
        return value === this.value;
      case ThresholdCondition.NOT_EQUAL:
        return value !== this.value;
      default:
        return false;
    }
  }

  /**
   * Format the threshold message
   */
  formatMessage(currentValue: any, projectName?: string): string {
    if (this.messageTemplate) {
      return this.messageTemplate
        .replace('{metric}', this.metric)
        .replace('{value}', String(currentValue))
        .replace('{threshold}', String(this.value))
        .replace('{project}', projectName || 'Project');
    }

    const conditionText = {
      [ThresholdCondition.GREATER_THAN]: 'exceeds',
      [ThresholdCondition.LESS_THAN]: 'falls below',
      [ThresholdCondition.GREATER_THAN_OR_EQUAL]: 'meets or exceeds',
      [ThresholdCondition.LESS_THAN_OR_EQUAL]: 'meets or falls below',
      [ThresholdCondition.EQUAL]: 'equals',
      [ThresholdCondition.NOT_EQUAL]: 'differs from',
    }[this.condition];

    return `${this.name}: ${currentValue} ${conditionText} threshold of ${this.value}${
      this.unit ? ` ${this.unit}` : ''
    }`;
  }
}