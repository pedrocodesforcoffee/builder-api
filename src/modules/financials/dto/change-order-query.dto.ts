import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PcoStatus } from '../enums/pco-status.enum';
import { OcoStatus } from '../enums/oco-status.enum';
import { CcoStatus } from '../enums/cco-status.enum';

/**
 * Change Order Query DTO
 *
 * Query parameters for filtering change orders across all types.
 * Supports filtering by status, date ranges, and amounts.
 */
export class ChangeOrderQueryDto {
  @ApiProperty({
    description: 'Filter PCOs by status',
    enum: PcoStatus,
    required: false,
    example: PcoStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PcoStatus)
  pcoStatus?: PcoStatus;

  @ApiProperty({
    description: 'Filter OCOs by status',
    enum: OcoStatus,
    required: false,
    example: OcoStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(OcoStatus)
  ocoStatus?: OcoStatus;

  @ApiProperty({
    description: 'Filter CCOs by status',
    enum: CcoStatus,
    required: false,
    example: CcoStatus.EXECUTED,
  })
  @IsOptional()
  @IsEnum(CcoStatus)
  ccoStatus?: CcoStatus;

  @ApiProperty({
    description: 'Filter by cost code ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  costCodeId?: string;

  @ApiProperty({
    description: 'Filter by minimum amount',
    required: false,
    example: 1000,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Filter by maximum amount',
    required: false,
    example: 50000,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiProperty({
    description: 'Filter by created after date (ISO 8601)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiProperty({
    description: 'Filter by created before date (ISO 8601)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiProperty({
    description: 'Filter by created by user ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiProperty({
    description: 'Include PCOs in results',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePcos?: boolean;

  @ApiProperty({
    description: 'Include OCOs in results',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeOcos?: boolean;

  @ApiProperty({
    description: 'Include CCOs in results',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCcos?: boolean;
}
