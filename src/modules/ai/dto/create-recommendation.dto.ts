import { IsString, IsOptional, IsNumber, IsArray, IsUUID, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType, RecommendationPriority } from '../enums';

/**
 * DTO for creating a recommendation
 * Used internally by AI services to generate recommendations
 */
export class CreateRecommendationDto {
  @ApiProperty({ description: 'Project ID', example: 'proj-123' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Recommendation type', enum: RecommendationType })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiProperty({ description: 'Recommendation priority', enum: RecommendationPriority, default: RecommendationPriority.MEDIUM })
  @IsEnum(RecommendationPriority)
  priority: RecommendationPriority;

  @ApiProperty({ description: 'Recommendation title', example: 'Consider similar project approach' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description', example: 'Based on 5 similar projects, consider using Design-Build delivery method' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Reasoning for recommendation', example: 'Similar projects averaged 15% cost savings with Design-Build' })
  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional({ description: 'Suggested action', example: 'Review contract structure with owner' })
  @IsOptional()
  @IsString()
  actionSuggestion?: string;

  @ApiPropertyOptional({ description: 'Type-specific data', example: { similarProjectIds: ['proj-456', 'proj-789'] } })
  @IsOptional()
  recommendationData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Supporting project IDs', example: ['proj-456', 'proj-789'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingProjects?: string[];

  @ApiPropertyOptional({ description: 'Confidence score (0.00 - 1.00)', example: 0.85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({ description: 'Context type', example: 'PROJECT_DASHBOARD' })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional({ description: 'Context entity ID', example: 'rfi-123' })
  @IsOptional()
  @IsUUID()
  contextEntityId?: string;

  @ApiPropertyOptional({ description: 'Context entity type', example: 'RFI' })
  @IsOptional()
  @IsString()
  contextEntityType?: string;

  @ApiPropertyOptional({ description: 'User ID to present recommendation to', example: 'user-123' })
  @IsOptional()
  @IsUUID()
  presentedToUserId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { source: 'pattern-analysis' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
