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
import { MetricGroup } from '../enums/metric-group.enum';
import { Project } from '../../projects/entities/project.entity';

/**
 * ProjectMetrics Entity
 *
 * Stores cached metric calculations for projects.
 * Metrics are grouped by category and cached with TTL support
 * to optimize dashboard performance.
 *
 * @entity project_metrics
 */
@Entity('project_metrics')
@Index('IDX_project_metrics_project_group', ['projectId', 'metricGroup'], { unique: true })
@Index('IDX_project_metrics_expires', ['expiresAt'])
@Index('IDX_project_metrics_calculated', ['calculatedAt'])
export class ProjectMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID this metric belongs to
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Metric group/category
   */
  @Column({
    type: 'enum',
    enum: MetricGroup,
    name: 'metric_group',
    nullable: false,
  })
  metricGroup!: MetricGroup;

  /**
   * Calculated metric data stored as JSONB
   * Structure varies by metric group
   */
  @Column({
    type: 'jsonb',
    name: 'metric_data',
    nullable: false,
    default: {},
  })
  metricData!: Record<string, any>;

  /**
   * Timestamp when metrics were calculated
   */
  @Column({
    type: 'timestamp',
    name: 'calculated_at',
    nullable: false,
  })
  calculatedAt!: Date;

  /**
   * Timestamp when this cache entry expires
   */
  @Column({
    type: 'timestamp',
    name: 'expires_at',
    nullable: false,
  })
  expiresAt!: Date;

  /**
   * Version number for cache invalidation
   */
  @Column({
    type: 'integer',
    nullable: false,
    default: 1,
  })
  version!: number;

  /**
   * Duration of calculation in milliseconds
   * Used for performance monitoring
   */
  @Column({
    type: 'integer',
    name: 'calculation_duration',
    nullable: true,
  })
  calculationDuration?: number;

  /**
   * Data source version/timestamp
   * Used to detect when underlying data has changed
   */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'data_source_version',
    nullable: true,
  })
  dataSourceVersion?: string;

  /**
   * Error information if calculation failed
   */
  @Column({
    type: 'jsonb',
    name: 'error_info',
    nullable: true,
  })
  errorInfo?: {
    message: string;
    stack?: string;
    timestamp: Date;
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

  // Helper methods

  /**
   * Check if cache entry is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Get age of cache entry in seconds
   */
  getAge(): number {
    return Math.floor((new Date().getTime() - this.calculatedAt.getTime()) / 1000);
  }

  /**
   * Check if calculation was successful
   */
  isSuccessful(): boolean {
    return !this.errorInfo;
  }
}