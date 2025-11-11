import { IsUUID, IsOptional, IsArray, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricGroup } from '../enums/metric-group.enum';
import { ComparisonType } from '../enums/comparison-type.enum';

/**
 * Request DTO for fetching project metrics
 */
export class GetProjectMetricsDto {
  @ApiPropertyOptional({
    description: 'Metric groups to fetch',
    enum: MetricGroup,
    isArray: true,
    example: [MetricGroup.SCHEDULE, MetricGroup.BUDGET],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetricGroup, { each: true })
  groups?: MetricGroup[];

  @ApiPropertyOptional({
    description: 'Time period for metrics',
    example: 'current',
  })
  @IsOptional()
  period?: string;

  @ApiPropertyOptional({
    description: 'Include historical data',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Force refresh bypassing cache',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  refresh?: boolean;

  @ApiPropertyOptional({
    description: 'Include comparison data',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeComparison?: boolean;

  @ApiPropertyOptional({
    description: 'Comparison type',
    enum: ComparisonType,
  })
  @IsOptional()
  @IsEnum(ComparisonType)
  comparisonType?: ComparisonType;

  @ApiPropertyOptional({
    description: 'Include alerts',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Start date for historical data',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for historical data',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Response DTO for project metrics
 */
export class ProjectMetricsResponseDto {
  @ApiProperty({
    description: 'Project ID',
  })
  projectId!: string;

  @ApiProperty({
    description: 'Timestamp when metrics were calculated',
  })
  calculatedAt!: Date;

  @ApiProperty({
    description: 'Metrics data by group',
    example: {
      SCHEDULE: {
        percentComplete: 45,
        daysRemaining: 120,
        scheduleVariance: -5,
      },
      BUDGET: {
        currentContract: 5000000,
        actualCostToDate: 2250000,
        costPerformanceIndex: 0.95,
      },
    },
  })
  metrics!: Record<string, any>;

  @ApiProperty({
    description: 'Key performance indicators',
  })
  kpis?: {
    primary?: any;
    secondary?: any[];
  };

  @ApiProperty({
    description: 'Active alerts',
    isArray: true,
  })
  alerts?: any[];

  @ApiProperty({
    description: 'Comparison data if requested',
  })
  comparison?: any;

  @ApiProperty({
    description: 'Historical data if requested',
    isArray: true,
  })
  history?: any[];

  @ApiProperty({
    description: 'Summary statistics',
  })
  summary?: Record<string, any>;

  @ApiProperty({
    description: 'Whether data was served from cache',
  })
  fromCache?: boolean;

  @ApiProperty({
    description: 'Cache expiry time',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Any warnings',
    isArray: true,
  })
  warnings?: string[];

  @ApiProperty({
    description: 'Any errors',
    isArray: true,
  })
  errors?: any[];
}

/**
 * Metric value DTO
 */
export class MetricValueDto {
  @ApiProperty({ description: 'Metric key' })
  key!: string;

  @ApiProperty({ description: 'Metric value' })
  value!: any;

  @ApiProperty({ description: 'Display label' })
  label?: string;

  @ApiProperty({ description: 'Unit of measurement' })
  unit?: string;

  @ApiProperty({ description: 'Formatting hint' })
  format?: string;

  @ApiProperty({ description: 'Previous value' })
  previousValue?: any;

  @ApiProperty({ description: 'Change amount' })
  change?: number;

  @ApiProperty({ description: 'Change percentage' })
  changePercentage?: number;

  @ApiProperty({ description: 'Trend direction' })
  trend?: string;

  @ApiProperty({ description: 'Has alert' })
  hasAlert?: boolean;

  @ApiProperty({ description: 'Alert severity' })
  alertSeverity?: string;
}

/**
 * Metric group summary DTO
 */
export class MetricGroupSummaryDto {
  @ApiProperty({
    description: 'Metric group',
    enum: MetricGroup,
  })
  group!: MetricGroup;

  @ApiProperty({ description: 'Group label' })
  label!: string;

  @ApiProperty({ description: 'Primary metric' })
  primaryMetric?: MetricValueDto;

  @ApiProperty({ description: 'Secondary metrics' })
  secondaryMetrics?: MetricValueDto[];

  @ApiProperty({ description: 'Alert count' })
  alertCount!: number;

  @ApiProperty({ description: 'Last updated' })
  lastUpdated!: Date;

  @ApiProperty({ description: 'Is stale' })
  isStale!: boolean;
}