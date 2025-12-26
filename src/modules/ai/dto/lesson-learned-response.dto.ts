import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { LessonLearnedCategory } from '../enums';

/**
 * Response DTO for lesson learned
 * Used when returning lesson learned data to clients
 */
@Exclude()
export class LessonLearnedResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  organizationId: string;

  @Expose()
  @ApiPropertyOptional()
  projectId?: string;

  @Expose()
  @ApiProperty({ enum: LessonLearnedCategory })
  category: LessonLearnedCategory;

  @Expose()
  @ApiProperty({ type: [String] })
  tags: string[];

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  situation: string;

  @Expose()
  @ApiProperty()
  action: string;

  @Expose()
  @ApiProperty()
  outcome: string;

  @Expose()
  @ApiProperty()
  lesson: string;

  @Expose()
  @ApiPropertyOptional()
  recommendedAction?: string;

  @Expose()
  @ApiPropertyOptional()
  impactType?: string;

  @Expose()
  @ApiPropertyOptional()
  costImpact?: number;

  @Expose()
  @ApiPropertyOptional()
  scheduleImpact?: number;

  // Note: Embedding excluded from response

  @Expose()
  @ApiPropertyOptional()
  embeddingGeneratedAt?: Date;

  @Expose()
  @ApiProperty()
  timesReferenced: number;

  @Expose()
  @ApiProperty()
  timesApplied: number;

  @Expose()
  @ApiPropertyOptional()
  effectivenessScore?: number;

  @Expose()
  @ApiProperty()
  aiGenerated: boolean;

  @Expose()
  @ApiPropertyOptional()
  createdByUserId?: string;

  @Expose()
  @ApiPropertyOptional()
  approvedByUserId?: string;

  @Expose()
  @ApiProperty()
  isApproved: boolean;

  @Expose()
  @ApiPropertyOptional()
  approvedAt?: Date;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  isPublic: boolean;

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
