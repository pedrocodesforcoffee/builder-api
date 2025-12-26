import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { ReportSchedule, ReportFormat } from './report-schedule.entity';
import { CustomReport } from './custom-report.entity';

/**
 * Report Execution Entity
 *
 * Tracks every report generation (manual or scheduled) for audit trail,
 * performance monitoring, and troubleshooting.
 *
 * Features:
 * - Complete execution lifecycle tracking
 * - File storage metadata for generated reports
 * - Email delivery status and error tracking
 * - Performance metrics (duration, file size)
 * - Links to scheduled reports and custom reports
 * - User or system triggered tracking
 *
 * Use Cases:
 * - View report generation history
 * - Debug failed report executions
 * - Monitor report performance
 * - Track email delivery status
 * - Audit trail for compliance
 */

export enum ReportExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ReportDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export enum ReportTriggerType {
  USER = 'USER',
  SCHEDULE = 'SCHEDULE',
}

@Entity('report_executions')
@Index(['projectId', 'reportType'])
@Index(['scheduledReportId'])
@Index(['customReportId'])
@Index(['status'])
@Index(['startedAt'])
@Index(['triggeredById'])
export class ReportExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Link to scheduled report if this execution was triggered by a schedule
   * Null for manual (user-triggered) executions
   */
  @Column({ name: 'scheduled_report_id', type: 'uuid', nullable: true })
  scheduledReportId!: string;

  @ManyToOne(() => ReportSchedule, { nullable: true })
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport!: ReportSchedule;

  /**
   * Report type: One of the standard report types (BUDGET_DETAIL, WIP, etc.)
   * or 'CUSTOM' for custom reports
   */
  @Column({ name: 'report_type', type: 'varchar', length: 100 })
  reportType!: string;

  /**
   * Link to custom report if reportType is 'CUSTOM'
   * Null for standard reports
   */
  @Column({ name: 'custom_report_id', type: 'uuid', nullable: true })
  customReportId!: string;

  @ManyToOne(() => CustomReport, { nullable: true })
  @JoinColumn({ name: 'custom_report_id' })
  customReport!: CustomReport;

  /**
   * Report parameters used for this execution (stored as JSONB)
   * Examples:
   * - { budgetId: "uuid", asOfDate: "2025-12-31" }
   * - { vendorId: "uuid", startDate: "2025-01-01", endDate: "2025-12-31" }
   */
  @Column({ type: 'jsonb', nullable: true })
  parameters!: Record<string, any>;

  /**
   * Execution timing
   */
  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date;

  /**
   * Execution status
   */
  @Column({ type: 'enum', enum: ReportExecutionStatus })
  status!: ReportExecutionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack!: string;

  /**
   * Export format and file metadata
   */
  @Column({ name: 'export_format', type: 'enum', enum: ReportFormat })
  exportFormat!: ReportFormat;

  /**
   * URL to the generated report file (S3, filesystem, etc.)
   * Null if execution failed before file generation
   */
  @Column({ name: 'file_url', type: 'varchar', length: 1000, nullable: true })
  fileUrl!: string;

  /**
   * Size of generated file in bytes
   */
  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes!: number;

  /**
   * Email delivery tracking
   */
  @Column({ name: 'recipient_count', type: 'int', default: 0 })
  recipientCount!: number;

  @Column({ name: 'delivery_status', type: 'enum', enum: ReportDeliveryStatus, nullable: true })
  deliveryStatus!: ReportDeliveryStatus;

  @Column({ name: 'delivery_error', type: 'text', nullable: true })
  deliveryError!: string;

  @Column({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true })
  deliveredAt!: Date;

  /**
   * Who/what triggered this execution
   */
  @Column({ name: 'triggered_by_id', type: 'uuid' })
  triggeredById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggered_by_id' })
  triggeredBy!: User;

  @Column({ name: 'triggered_by_type', type: 'enum', enum: ReportTriggerType })
  triggeredByType!: ReportTriggerType;

  /**
   * Performance metrics
   */
  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number; // Calculated: completedAt - startedAt

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount!: number; // Number of rows in report

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Alias for fileSizeBytes (for backward compatibility)
   */
  get fileSize(): number | undefined {
    return this.fileSizeBytes;
  }

  /**
   * Alias for deliveryStatus === 'SENT' (for backward compatibility)
   */
  get emailSent(): boolean {
    return this.deliveryStatus === ReportDeliveryStatus.SENT;
  }

  /**
   * Alias for deliveredAt (for backward compatibility)
   */
  get emailSentAt(): Date | undefined {
    return this.deliveredAt;
  }

  /**
   * Calculate duration in milliseconds
   */
  calculateDuration(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  /**
   * Check if execution was successful
   */
  isSuccessful(): boolean {
    return this.status === ReportExecutionStatus.SUCCESS;
  }

  /**
   * Check if execution failed
   */
  isFailed(): boolean {
    return this.status === ReportExecutionStatus.FAILED;
  }

  /**
   * Check if execution is still running
   */
  isRunning(): boolean {
    return (
      this.status === ReportExecutionStatus.PENDING ||
      this.status === ReportExecutionStatus.RUNNING
    );
  }
}
