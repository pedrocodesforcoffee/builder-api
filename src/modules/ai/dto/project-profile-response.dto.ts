import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Response DTO for project profile
 * Used when returning project profile data to clients
 */
@Exclude()
export class ProjectProfileResponseDto {
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
  @ApiProperty()
  projectType: string;

  @Expose()
  @ApiPropertyOptional()
  buildingType?: string;

  @Expose()
  @ApiPropertyOptional()
  deliveryMethod?: string;

  @Expose()
  @ApiPropertyOptional()
  contractValue?: number;

  @Expose()
  @ApiPropertyOptional()
  squareFootage?: number;

  @Expose()
  @ApiPropertyOptional()
  durationDays?: number;

  @Expose()
  @ApiPropertyOptional()
  location?: string;

  @Expose()
  @ApiPropertyOptional()
  latitude?: number;

  @Expose()
  @ApiPropertyOptional()
  longitude?: number;

  @Expose()
  @ApiPropertyOptional({ type: [String] })
  scopeElements?: string[];

  @Expose()
  @ApiPropertyOptional({ type: [String] })
  specialtyTrades?: string[];

  @Expose()
  @ApiProperty()
  isComplete: boolean;

  @Expose()
  @ApiPropertyOptional()
  completionDate?: Date;

  @Expose()
  @ApiPropertyOptional()
  finalCost?: number;

  @Expose()
  @ApiPropertyOptional()
  costVariancePercent?: number;

  @Expose()
  @ApiPropertyOptional()
  scheduleVarianceDays?: number;

  @Expose()
  @ApiPropertyOptional()
  rfiCount?: number;

  @Expose()
  @ApiPropertyOptional()
  changeOrderCount?: number;

  @Expose()
  @ApiPropertyOptional()
  changeOrderValue?: number;

  @Expose()
  @ApiPropertyOptional()
  safetyIncidentCount?: number;

  @Expose()
  @ApiPropertyOptional()
  qualityIssueCount?: number;

  @Expose()
  @ApiPropertyOptional()
  clientSatisfactionScore?: number;

  @Expose()
  @ApiPropertyOptional()
  profitMarginPercent?: number;

  // Note: Embedding is excluded from response for performance
  // It's a large array (1536 dimensions) not needed in API responses

  @Expose()
  @ApiPropertyOptional()
  embeddingGeneratedAt?: Date;

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
