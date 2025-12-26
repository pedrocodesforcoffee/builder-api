import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationType } from '../entities/project-location.entity';

/**
 * DTO for creating a new project location
 */
export class CreateLocationDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'a6074e71-6f3f-40c0-a201-1e87b238df81',
  })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Building A',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Location code (must be unique within project)',
    example: 'BLDG-A',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({
    description: 'Location type',
    enum: LocationType,
    example: LocationType.BUILDING,
  })
  @IsEnum(LocationType)
  type: LocationType;

  @ApiPropertyOptional({
    description: 'Location description',
    example: 'Main building structure',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent location ID (for hierarchical structure)',
    example: 'uuid-of-parent',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

/**
 * DTO for updating a project location
 */
export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  // Inherits all fields from CreateLocationDto as optional
  // Excludes projectId since it cannot be changed
}

/**
 * DTO for querying project locations with filters
 */
export class QueryLocationsDto {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: 'a6074e71-6f3f-40c0-a201-1e87b238df81',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by location type',
    enum: LocationType,
  })
  @IsEnum(LocationType)
  @IsOptional()
  type?: LocationType;

  @ApiPropertyOptional({
    description: 'Filter by parent location ID',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Search by name or code',
    example: 'Building',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include punch item counts',
    example: true,
  })
  @IsOptional()
  includeCounts?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}

/**
 * DTO for bulk creating locations
 */
export class BulkCreateLocationsDto {
  @ApiProperty({
    description: 'Array of locations to create',
    type: [CreateLocationDto],
  })
  @IsArray()
  @Type(() => CreateLocationDto)
  locations: CreateLocationDto[];
}

/**
 * Response DTO with location tree structure
 */
export class LocationTreeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: LocationType })
  type: LocationType;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional({
    description: 'Full path from root to this location',
    example: 'Building A / Floor 1 / Unit 101',
  })
  fullPath?: string;

  @ApiPropertyOptional({
    description: 'Number of punch items at this location',
  })
  punchItemCount?: number;

  @ApiPropertyOptional({
    description: 'Child locations',
    type: 'array',
    items: { $ref: '#/components/schemas/LocationTreeDto' },
  })
  children?: LocationTreeDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
