import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { RecommendationType, RecommendationStatus, RecommendationPriority } from '../enums';

/**
 * Response DTO for recommendation
 * Used when returning recommendation data to clients
 */
@Exclude()
export class RecommendationResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  projectId: string;

  @Expose()
  @ApiProperty()
  organizationId: string;

  @Expose()
  @ApiProperty({ enum: RecommendationType })
  type: RecommendationType;

  @Expose()
  @ApiProperty({ enum: RecommendationStatus })
  status: RecommendationStatus;

  @Expose()
  @ApiProperty({ enum: RecommendationPriority })
  priority: RecommendationPriority;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  description: string;

  @Expose()
  @ApiPropertyOptional()
  reasoning?: string;

  @Expose()
  @ApiPropertyOptional()
  actionSuggestion?: string;

  @Expose()
  @ApiPropertyOptional()
  recommendationData?: Record<string, any>;

  @Expose()
  @ApiPropertyOptional({ type: [String] })
  supportingProjects?: string[];

  @Expose()
  @ApiPropertyOptional()
  confidenceScore?: number;

  @Expose()
  @ApiPropertyOptional()
  contextType?: string;

  @Expose()
  @ApiPropertyOptional()
  contextEntityId?: string;

  @Expose()
  @ApiPropertyOptional()
  contextEntityType?: string;

  @Expose()
  @ApiPropertyOptional()
  presentedToUserId?: string;

  @Expose()
  @ApiPropertyOptional()
  presentedAt?: Date;

  @Expose()
  @ApiPropertyOptional()
  actionTakenByUserId?: string;

  @Expose()
  @ApiPropertyOptional()
  actionTakenAt?: Date;

  @Expose()
  @ApiPropertyOptional()
  userFeedback?: string;

  @Expose()
  @ApiPropertyOptional()
  userRating?: number;

  @Expose()
  @ApiPropertyOptional()
  expiresAt?: Date;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}
