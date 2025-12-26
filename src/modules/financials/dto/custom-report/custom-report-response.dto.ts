import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomReportConfig } from '../../entities/custom-report.entity';

/**
 * Custom Report Response DTO
 *
 * Response DTO for custom report endpoints.
 */
export class CustomReportResponseDto {
  @ApiProperty({
    description: 'Report ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  projectId!: string;

  @ApiProperty({
    description: 'Report name',
    example: 'Budget Summary by Cost Code',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Report description',
    example: 'Summarizes budget amounts grouped by cost code division',
  })
  description?: string;

  @ApiProperty({
    description: 'Report configuration',
  })
  config!: CustomReportConfig;

  @ApiProperty({
    description: 'Is report visible to all project members',
    example: false,
  })
  isPublic!: boolean;

  @ApiProperty({
    description: 'User who created the report',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Report creation timestamp',
    example: '2025-12-10T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Report last update timestamp',
    example: '2025-12-10T10:00:00Z',
  })
  updatedAt!: Date;
}
