import { IsUUID, IsArray, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricGroup } from '../enums/metric-group.enum';

/**
 * Request DTO for batch metrics fetch
 */
export class BatchMetricsRequestDto {
  @ApiProperty({
    description: 'Array of project IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds!: string[];

  @ApiPropertyOptional({
    description: 'Metric groups to fetch',
    enum: MetricGroup,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetricGroup, { each: true })
  groups?: MetricGroup[];

  @ApiPropertyOptional({
    description: 'Include alerts for each project',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Include KPIs for each project',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeKpis?: boolean;
}

/**
 * Response DTO for batch metrics
 */
export class BatchMetricsResponseDto {
  @ApiProperty({
    description: 'Metrics for each project',
    type: Object,
  })
  projects!: Record<string, ProjectMetricsItem>;

  @ApiProperty({
    description: 'Summary of batch operation',
  })
  summary!: {
    totalProjects: number;
    successful: number;
    failed: number;
    fromCache: number;
    calculationTime: number;
  };

  @ApiProperty({
    description: 'Any errors encountered',
    isArray: true,
  })
  errors?: Array<{
    projectId: string;
    error: string;
  }>;
}

/**
 * Individual project metrics in batch response
 */
export class ProjectMetricsItem {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Calculated metrics' })
  metrics!: Record<string, any>;

  @ApiProperty({ description: 'Key performance indicators' })
  kpis?: any;

  @ApiProperty({ description: 'Active alerts count' })
  alertCount?: number;

  @ApiProperty({ description: 'From cache indicator' })
  fromCache!: boolean;

  @ApiProperty({ description: 'Calculation timestamp' })
  calculatedAt!: Date;

  @ApiProperty({ description: 'Any warnings' })
  warnings?: string[];
}