import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsObject,
  IsUUID,
  IsDateString,
  IsNumber,
  ValidateIf,
  Matches,
  IsNotEmpty,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReportType,
  ReportFormat,
  ScheduleFrequency,
} from '../../entities/report-schedule.entity';

/**
 * Create Report Schedule DTO
 *
 * Defines the structure for creating a new automated report schedule.
 */
export class CreateReportScheduleDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
    example: ReportType.BUDGET_DETAIL,
  })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty({
    description: 'Descriptive name for this scheduled report',
    example: 'Weekly Budget Variance Report',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  reportName!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the report schedule purpose',
    example: 'Sends budget variance report to project managers every Monday morning',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: ReportFormat.PDF,
    default: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiProperty({
    description: 'Schedule frequency',
    enum: ScheduleFrequency,
    example: ScheduleFrequency.WEEKLY,
  })
  @IsEnum(ScheduleFrequency)
  frequency!: ScheduleFrequency;

  @ApiPropertyOptional({
    description:
      'Cron expression for CUSTOM frequency (e.g., "0 9 * * 1" = every Monday at 9am). Required if frequency is CUSTOM.',
    example: '0 9 * * 1',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.frequency === ScheduleFrequency.CUSTOM)
  @Matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'Invalid cron expression format',
  })
  cronExpression?: string;

  @ApiProperty({
    description: 'Comma-separated list of email recipients',
    example: 'manager@example.com,pm@example.com',
  })
  @IsString()
  @IsNotEmpty()
  emailRecipients!: string;

  @ApiProperty({
    description: 'Email subject line (supports placeholders: {{reportName}}, {{date}}, {{projectName}})',
    example: '{{reportName}} - {{projectName}} - {{date}}',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  emailSubject!: string;

  @ApiProperty({
    description: 'Email body text (supports placeholders: {{reportName}}, {{date}}, {{projectName}})',
    example: 'Please find attached the {{reportName}} for {{projectName}} as of {{date}}.',
  })
  @IsString()
  @IsNotEmpty()
  emailBody!: string;

  @ApiPropertyOptional({
    description: 'Report-specific parameters (varies by report type)',
    example: { budgetId: 'uuid-here', includeDetails: true },
  })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the schedule is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Update Report Schedule DTO
 *
 * Allows partial updates to existing report schedules.
 */
export class UpdateReportScheduleDto {
  @ApiPropertyOptional({
    description: 'Descriptive name for this scheduled report',
    example: 'Weekly Budget Variance Report',
  })
  @IsString()
  @IsOptional()
  @Length(3, 255)
  reportName?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the report schedule purpose',
    example: 'Sends budget variance report to project managers every Monday morning',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Output format for the report',
    enum: ReportFormat,
    example: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({
    description: 'Schedule frequency',
    enum: ScheduleFrequency,
    example: ScheduleFrequency.WEEKLY,
  })
  @IsEnum(ScheduleFrequency)
  @IsOptional()
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional({
    description: 'Cron expression for CUSTOM frequency',
    example: '0 9 * * 1',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.frequency === ScheduleFrequency.CUSTOM)
  @Matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'Invalid cron expression format',
  })
  cronExpression?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of email recipients',
    example: 'manager@example.com,pm@example.com',
  })
  @IsString()
  @IsOptional()
  emailRecipients?: string;

  @ApiPropertyOptional({
    description: 'Email subject line (supports placeholders)',
    example: '{{reportName}} - {{projectName}} - {{date}}',
  })
  @IsString()
  @IsOptional()
  @Length(1, 500)
  emailSubject?: string;

  @ApiPropertyOptional({
    description: 'Email body text (supports placeholders)',
    example: 'Please find attached the {{reportName}} for {{projectName}} as of {{date}}.',
  })
  @IsString()
  @IsOptional()
  emailBody?: string;

  @ApiPropertyOptional({
    description: 'Report-specific parameters (varies by report type)',
    example: { budgetId: 'uuid-here', includeDetails: true },
  })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the schedule is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Report Schedule Response DTO
 *
 * Structure returned when retrieving report schedule information.
 */
export class ReportScheduleResponseDto {
  @ApiProperty({ description: 'Schedule ID', example: 'uuid-here' })
  id!: string;

  @ApiProperty({ description: 'Project ID', example: 'uuid-here' })
  projectId!: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  reportType!: ReportType;

  @ApiProperty({ description: 'Report name', example: 'Weekly Budget Variance Report' })
  reportName!: string;

  @ApiPropertyOptional({ description: 'Description', example: 'Sends budget variance report every Monday' })
  description?: string;

  @ApiProperty({ description: 'Report format', enum: ReportFormat })
  format!: ReportFormat;

  @ApiProperty({ description: 'Schedule frequency', enum: ScheduleFrequency })
  frequency!: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Cron expression', example: '0 9 * * 1' })
  cronExpression?: string;

  @ApiProperty({ description: 'Email recipients', example: 'manager@example.com,pm@example.com' })
  emailRecipients!: string;

  @ApiProperty({ description: 'Email subject', example: 'Weekly Budget Report - {{projectName}}' })
  emailSubject!: string;

  @ApiProperty({ description: 'Email body', example: 'Please find attached the report...' })
  emailBody!: string;

  @ApiPropertyOptional({ description: 'Report parameters' })
  parameters?: Record<string, any>;

  @ApiProperty({ description: 'Is schedule active', example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Next scheduled run time' })
  nextRunAt?: Date;

  @ApiPropertyOptional({ description: 'Last successful run time' })
  lastRunAt?: Date;

  @ApiProperty({ description: 'Total successful run count', example: 42 })
  runCount!: number;

  @ApiPropertyOptional({ description: 'Last failure timestamp' })
  lastFailureAt?: Date;

  @ApiPropertyOptional({ description: 'Last failure reason', example: 'Email delivery failed' })
  lastFailureReason?: string;

  @ApiProperty({ description: 'Consecutive failure count', example: 0 })
  failureCount!: number;

  @ApiProperty({ description: 'Creator user ID', example: 'uuid-here' })
  createdById!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

/**
 * Query Report Schedules DTO
 *
 * Filtering and pagination options for listing report schedules.
 */
export class QueryReportSchedulesDto {
  @ApiPropertyOptional({ description: 'Filter by report type', enum: ReportType })
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @ApiPropertyOptional({ description: 'Filter by report format', enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Filter by frequency', enum: ScheduleFrequency })
  @IsEnum(ScheduleFrequency)
  @IsOptional()
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of records to skip', example: 0, default: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ description: 'Number of records to return', example: 50, default: 50 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  take?: number;
}

/**
 * Execute Report Schedule DTO
 *
 * Manual trigger for immediate report generation and delivery.
 */
export class ExecuteReportScheduleDto {
  @ApiPropertyOptional({
    description: 'Override email recipients for this execution (comma-separated)',
    example: 'admin@example.com',
  })
  @IsString()
  @IsOptional()
  emailRecipients?: string;

  @ApiPropertyOptional({
    description: 'Override report parameters for this execution',
    example: { asOfDate: '2025-12-10' },
  })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}
