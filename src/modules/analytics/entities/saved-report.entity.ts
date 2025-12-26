import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum ReportType {
  RFI_STATUS = 'RFI_STATUS',
  RFI_AGING = 'RFI_AGING',
  RFI_RESPONSE_TIME = 'RFI_RESPONSE_TIME',
  RFI_BY_DISCIPLINE = 'RFI_BY_DISCIPLINE',
  RFI_IMPACT = 'RFI_IMPACT',
  SUBMITTAL_STATUS = 'SUBMITTAL_STATUS',
  SUBMITTAL_LOG = 'SUBMITTAL_LOG',
  SUBMITTAL_AGING = 'SUBMITTAL_AGING',
  SUBMITTAL_BY_SPEC = 'SUBMITTAL_BY_SPEC',
  SUBMITTAL_APPROVAL_RATE = 'SUBMITTAL_APPROVAL_RATE',
  COMBINED_DASHBOARD = 'COMBINED_DASHBOARD',
  USER_PERFORMANCE = 'USER_PERFORMANCE',
  BOTTLENECK_ANALYSIS = 'BOTTLENECK_ANALYSIS',
  TREND_ANALYSIS = 'TREND_ANALYSIS',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

@Entity('saved_reports')
@Index(['projectId', 'reportType'])
@Index(['createdById'])
@Index(['organizationId', 'isTemplate'])
export class SavedReport {
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

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType;

  // Filter and configuration for this report
  @Column({ type: 'jsonb' })
  configuration: {
    dateRange?: {
      startDate?: string;
      endDate?: string;
      relativePeriod?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL_TIME';
    };
    filters?: {
      statuses?: string[];
      priorities?: string[];
      disciplines?: string[];
      specSections?: string[];
      assignees?: string[];
      companies?: string[];
    };
    groupBy?: string[];
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    includeCharts?: boolean;
    chartTypes?: string[];
    columns?: string[];
  };

  // Is this a template that can be reused?
  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  // Is this shared with the team?
  @Column({ type: 'boolean', default: false })
  isShared: boolean;

  // Scheduled report settings
  @Column({ type: 'boolean', default: false })
  isScheduled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  scheduleConfig: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm
    format: ReportFormat;
    recipients: string[]; // email addresses or user IDs
    lastRun?: Date;
    nextRun?: Date;
  };

  @Column({ type: 'uuid', name: 'createdById' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
