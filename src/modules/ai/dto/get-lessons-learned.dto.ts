import { IsUUID, IsOptional, IsEnum, IsArray, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LessonLearnedCategory } from '../enums';

/**
 * DTO for querying lessons learned
 * Used to filter and search organizational knowledge base
 */
export class GetLessonsLearnedDto {
  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Project ID filter', example: 'proj-123' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by categories', enum: LessonLearnedCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(LessonLearnedCategory, { each: true })
  categories?: LessonLearnedCategory[];

  @ApiPropertyOptional({ description: 'Filter by tags', example: ['concrete', 'foundation'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Search query (searches title, situation, lesson)', example: 'winter construction' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Only show approved lessons', example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approvedOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Only show public lessons', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  publicOnly?: boolean;

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

  @ApiPropertyOptional({ description: 'Sort by field', example: 'createdAt', default: 'timesReferenced' })
  @IsOptional()
  sortBy?: string = 'timesReferenced';

  @ApiPropertyOptional({ description: 'Sort direction', example: 'DESC', default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
