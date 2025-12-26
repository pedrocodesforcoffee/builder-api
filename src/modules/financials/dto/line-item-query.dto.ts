import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * Line Item Query DTO
 *
 * Parameters for filtering, sorting, and paginating budget line items.
 */
export class LineItemQueryDto {
  @ApiProperty({
    description: 'Filter by category',
    enum: BudgetCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(BudgetCategory)
  category?: BudgetCategory;

  @ApiProperty({
    description: 'Filter by cost code ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  costCodeId?: string;

  @ApiProperty({
    description: 'Search by cost code or notes (partial match)',
    required: false,
    example: 'General',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    default: 'displayOrder',
    example: 'budgetedCost',
    enum: ['displayOrder', 'budgetedCost', 'category', 'actualCost', 'variance'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'displayOrder';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    default: 'ASC',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
