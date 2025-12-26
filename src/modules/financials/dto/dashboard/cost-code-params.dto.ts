import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Cost Code Query Parameters DTO
 *
 * Filtering and pagination parameters for cost code breakdown endpoint.
 */
export class CostCodeParamsDto {
  @ApiProperty({
    description: 'Filter by CSI division code',
    example: '03',
    required: false,
  })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiProperty({
    description: 'Filter by cost code category',
    example: 'Concrete',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Search by cost code or description',
    example: 'Cast-in-Place',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort field',
    enum: ['code', 'description', 'budget', 'committed', 'actual', 'variance', 'percentComplete'],
    example: 'code',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'code' | 'description' | 'budget' | 'committed' | 'actual' | 'variance' | 'percentComplete';

  @ApiProperty({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({
    description: 'Number of records to skip (for pagination)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;

  @ApiProperty({
    description: 'Number of records to return (for pagination)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number;
}
