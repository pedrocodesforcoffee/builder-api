import { IsOptional, IsEnum, IsString, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationStatus } from '../enums';

/**
 * DTO for updating a recommendation
 * Used when user interacts with a recommendation (accept, reject, rate)
 */
export class UpdateRecommendationDto {
  @ApiPropertyOptional({ description: 'New status', enum: RecommendationStatus })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ description: 'User feedback', example: 'This recommendation was very helpful' })
  @IsOptional()
  @IsString()
  userFeedback?: string;

  @ApiPropertyOptional({ description: 'User rating (1-5 stars)', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  userRating?: number;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { appliedDate: '2025-01-15' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
