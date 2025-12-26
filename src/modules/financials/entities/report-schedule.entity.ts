import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Report Schedule Entity
 *
 * Defines automated financial report generation and email delivery schedules.
 *
 * Features:
 * - Cron-based scheduling for recurring reports
 * - Support for all 16 financial report types
 * - Multiple output formats (PDF, Excel)
 * - Email delivery to multiple recipients
 * - Configurable report parameters
 * - Active/inactive status control
 * - Audit trail (created/updated timestamps, creator tracking)
 *
 * Use Cases:
 * - Weekly budget variance reports
 * - Monthly executive summaries
 * - Daily WIP reports
 * - Quarterly financial analysis
 */

export enum ReportType {
  BUDGET_DETAIL = 'BUDGET_DETAIL',
  WIP = 'WIP',
  COST_TO_COMPLETE = 'COST_TO_COMPLETE',
  COMMITMENT_LIST = 'COMMITMENT_LIST',
  EARNED_VALUE_ANALYSIS = 'EARNED_VALUE_ANALYSIS',
  CASH_FLOW_PROJECTION = 'CASH_FLOW_PROJECTION',
  INVOICE_REGISTER = 'INVOICE_REGISTER',
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
  BUDGET_VARIANCE = 'BUDGET_VARIANCE',
  COMMITMENT_STATUS = 'COMMITMENT_STATUS',
  PAYMENT_HISTORY = 'PAYMENT_HISTORY',
  AGING = 'AGING',
  CHANGE_ORDER_LOG = 'CHANGE_ORDER_LOG',
  CHANGE_ORDER_SUMMARY = 'CHANGE_ORDER_SUMMARY',
  SUBCONTRACTOR_SUMMARY = 'SUBCONTRACTOR_SUMMARY',
  VENDOR_PAYMENTS = 'VENDOR_PAYMENTS',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
}

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

@Entity('report_schedules')
@Index(['projectId', 'reportType'])
@Index(['isActive'])
@Index(['nextRunAt'])
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'report_type', type: 'enum', enum: ReportType })
  reportType!: ReportType;

  @Column({ name: 'report_name', type: 'varchar', length: 255 })
  reportName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'format', type: 'enum', enum: ReportFormat, default: ReportFormat.PDF })
  format!: ReportFormat;

  @Column({ name: 'frequency', type: 'enum', enum: ScheduleFrequency })
  frequency!: ScheduleFrequency;

  /**
   * Cron expression for CUSTOM frequency (e.g., "0 9 * * 1" = every Monday at 9am)
   * Format: minute hour day month dayOfWeek
   *
   * Common patterns:
   * - Daily at 8am: "0 8 * * *"
   * - Weekly on Monday at 9am: "0 9 * * 1"
   * - Monthly on 1st at 10am: "0 10 1 * *"
   * - Every weekday at 6am: "0 6 * * 1-5"
   */
  @Column({ name: 'cron_expression', type: 'varchar', length: 100, nullable: true })
  cronExpression!: string;

  /**
   * Email recipients (comma-separated email addresses)
   */
  @Column({ name: 'email_recipients', type: 'text' })
  emailRecipients!: string;

  /**
   * Email subject line template (can include placeholders like {{reportName}}, {{date}})
   */
  @Column({ name: 'email_subject', type: 'varchar', length: 500 })
  emailSubject!: string;

  /**
   * Email body template (can include placeholders like {{reportName}}, {{date}}, {{projectName}})
   */
  @Column({ name: 'email_body', type: 'text' })
  emailBody!: string;

  /**
   * Report-specific parameters (stored as JSONB for flexibility)
   *
   * Examples:
   * - Budget Detail: { budgetId: "uuid", includeDetails: true }
   * - WIP: { asOfDate: "2025-12-31", includeCostBreakdown: true }
   * - Commitment List: { status: ["ACTIVE", "PENDING"], vendorId: "uuid" }
   */
  @Column({ type: 'jsonb', nullable: true })
  parameters!: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Timestamp of the next scheduled execution
   */
  @Column({ name: 'next_run_at', type: 'timestamp with time zone', nullable: true })
  nextRunAt!: Date;

  /**
   * Timestamp of the last successful execution
   */
  @Column({ name: 'last_run_at', type: 'timestamp with time zone', nullable: true })
  lastRunAt!: Date;

  /**
   * Count of successful executions
   */
  @Column({ name: 'run_count', type: 'int', default: 0 })
  runCount!: number;

  /**
   * Timestamp of the last failed execution
   */
  @Column({ name: 'last_failure_at', type: 'timestamp with time zone', nullable: true })
  lastFailureAt!: Date;

  /**
   * Error message from last failure
   */
  @Column({ name: 'last_failure_reason', type: 'text', nullable: true })
  lastFailureReason!: string;

  /**
   * Count of consecutive failures
   */
  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount!: number;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
