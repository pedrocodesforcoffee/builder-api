import { IsUUID, IsOptional, IsInt, Min, Max, IsNumber, IsArray, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for finding similar projects
 * Used in similarity matching algorithm
 */
export class FindSimilarProjectsDto {
  @ApiProperty({ description: 'Source project ID to find similar projects for', example: 'proj-123' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Maximum number of similar projects to return', example: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;

  @ApiPropertyOptional({ description: 'Minimum similarity score (0.0 - 1.0)', example: 0.3, default: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minSimilarityScore?: number = 0.3;

  @ApiPropertyOptional({ description: 'Only include completed projects', example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  onlyCompleted?: boolean = true;

  @ApiPropertyOptional({ description: 'Filter by project types', example: ['Commercial', 'Industrial'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectTypes?: string[];

  @ApiPropertyOptional({ description: 'Filter by building types', example: ['Office', 'Warehouse'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  buildingTypes?: string[];

  @ApiPropertyOptional({ description: 'Use embedding-based similarity (slower but more accurate)', example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  useEmbeddings?: boolean = false;
}
