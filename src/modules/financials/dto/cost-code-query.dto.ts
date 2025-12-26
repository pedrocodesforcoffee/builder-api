import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Cost Code Query DTO
 *
 * Parameters for filtering, sorting, and paginating cost codes.
 */
export class CostCodeQueryDto {
  @ApiProperty({
    description: 'Filter by parent cost code ID (get children of this code)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'Filter to only root cost codes (no parent)',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  rootOnly?: boolean;

  @ApiProperty({
    description: 'Search by code or name (partial match)',
    required: false,
    example: 'General',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter to only active cost codes',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    default: 'code',
    example: 'name',
    enum: ['code', 'name', 'displayOrder', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'code';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    default: 'ASC',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
