import { ApiProperty } from '@nestjs/swagger';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * Budget Comparison Category Item
 */
export class BudgetComparisonCategoryItemDto {
  @ApiProperty({
    description: 'Budget category',
    enum: BudgetCategory,
    example: BudgetCategory.LABOR,
  })
  category!: BudgetCategory;

  @ApiProperty({
    description: 'First budget amount',
    example: 500000.0,
  })
  budget1!: number;

  @ApiProperty({
    description: 'Second budget amount',
    example: 550000.0,
  })
  budget2!: number;

  @ApiProperty({
    description: 'Difference (budget2 - budget1)',
    example: 50000.0,
  })
  difference!: number;

  @ApiProperty({
    description: 'Percentage change',
    example: 10.0,
  })
  percentageChange!: number;
}

/**
 * Budget Comparison DTO
 *
 * Comparison between two budgets showing differences and percentage changes.
 */
export class BudgetComparisonDto {
  @ApiProperty({
    description: 'First budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budget1Id!: string;

  @ApiProperty({
    description: 'Second budget ID',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  budget2Id!: string;

  @ApiProperty({
    description: 'First budget total',
    example: 1500000.0,
  })
  budget1Total!: number;

  @ApiProperty({
    description: 'Second budget total',
    example: 1600000.0,
  })
  budget2Total!: number;

  @ApiProperty({
    description: 'Difference between budgets (budget2 - budget1)',
    example: 100000.0,
  })
  difference!: number;

  @ApiProperty({
    description: 'Percentage change',
    example: 6.67,
  })
  percentageChange!: number;

  @ApiProperty({
    description: 'Category-wise comparison',
    type: [BudgetComparisonCategoryItemDto],
  })
  categoryComparison!: BudgetComparisonCategoryItemDto[];
}
