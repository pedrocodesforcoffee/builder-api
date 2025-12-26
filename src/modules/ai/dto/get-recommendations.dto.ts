import { IsUUID, IsOptional, IsEnum, IsArray, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecommendationType, RecommendationStatus, RecommendationPriority } from '../enums';

/**
 * DTO for querying recommendations
 * Used to filter and paginate recommendations
 */
export class GetRecommendationsDto {
  @ApiProperty({ description: 'Project ID', example: 'proj-123' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Filter by recommendation types', enum: RecommendationType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RecommendationType, { each: true })
  types?: RecommendationType[];

  @ApiPropertyOptional({ description: 'Filter by statuses', enum: RecommendationStatus, isArray: true, default: [RecommendationStatus.ACTIVE] })
  @IsOptional()
  @IsArray()
  @IsEnum(RecommendationStatus, { each: true })
  statuses?: RecommendationStatus[] = [RecommendationStatus.ACTIVE];

  @ApiPropertyOptional({ description: 'Filter by priorities', enum: RecommendationPriority, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RecommendationPriority, { each: true })
  priorities?: RecommendationPriority[];

  @ApiPropertyOptional({ description: 'Only show actionable recommendations', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  actionableOnly?: boolean;

  @ApiPropertyOptional({ description: 'Context type filter', example: 'PROJECT_DASHBOARD' })
  @IsOptional()
  contextType?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'createdAt', default: 'priority' })
  @IsOptional()
  sortBy?: string = 'priority';

  @ApiPropertyOptional({ description: 'Sort direction', example: 'DESC', default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
