import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CommitmentStatus } from '../enums/commitment-status.enum';
import { CommitmentType } from '../enums/commitment-type.enum';

/**
 * Commitment Query DTO
 *
 * Parameters for filtering, sorting, and paginating commitments.
 */
export class CommitmentQueryDto {
  @ApiProperty({
    description: 'Filter by commitment type',
    enum: CommitmentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CommitmentType)
  type?: CommitmentType;

  @ApiProperty({
    description: 'Filter by commitment status',
    enum: CommitmentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(CommitmentStatus)
  status?: CommitmentStatus;

  @ApiProperty({
    description: 'Search by title, number, or vendor name (partial match)',
    required: false,
    example: 'HVAC',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by vendor name (exact match)',
    required: false,
  })
  @IsOptional()
  @IsString()
  vendorName?: string;

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
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    default: 'createdAt',
    example: 'number',
    enum: [
      'number',
      'title',
      'type',
      'status',
      'vendorName',
      'originalAmount',
      'currentAmount',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    default: 'DESC',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
