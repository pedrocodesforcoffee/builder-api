import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Pagination Query DTO
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Number of records to return', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;
}

/**
 * QuickBooks API Error Response
 */
export class QBApiErrorDto {
  @ApiProperty({ description: 'Error code' })
  code!: string;

  @ApiProperty({ description: 'Error message' })
  message!: string;

  @ApiPropertyOptional({ description: 'Additional error details' })
  detail?: string;
}

/**
 * Base Response DTO with metadata
 */
export class QBBaseResponseDto<T> {
  @ApiProperty({ description: 'Success status' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error information' })
  error?: QBApiErrorDto;

  @ApiPropertyOptional({ description: 'Response timestamp' })
  timestamp?: Date;
}
