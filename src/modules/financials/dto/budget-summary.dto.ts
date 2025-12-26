import { ApiProperty } from '@nestjs/swagger';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * Budget Summary DTO
 *
 * Comprehensive budget overview with category breakdown and top cost codes.
 */
export class BudgetSummaryDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Total budgeted cost',
    example: 1500000.0,
  })
  totalBudget!: number;

  @ApiProperty({
    description: 'Number of line items',
    example: 45,
  })
  lineItemCount!: number;

  @ApiProperty({
    description: 'Category breakdown',
    example: {
      LABOR: 500000.0,
      MATERIAL: 400000.0,
      EQUIPMENT: 200000.0,
      SUBCONTRACT: 300000.0,
      OTHER: 100000.0,
    },
  })
  categoryBreakdown!: { [key in BudgetCategory]: number };

  @ApiProperty({
    description: 'Top 5 cost codes by budgeted amount',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        costCode: { type: 'string', example: '01-1000' },
        costCodeName: { type: 'string', example: 'General Requirements' },
        total: { type: 'number', example: 250000.0 },
        percentage: { type: 'number', example: 16.67 },
      },
    },
  })
  topCostCodes!: Array<{
    costCode: string;
    costCodeName: string;
    total: number;
    percentage: number;
  }>;
}

/**
 * Budget Category Breakdown DTO
 *
 * Breakdown of budgeted costs by category.
 */
export class BudgetCategoryBreakdownDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Category breakdown',
    example: {
      LABOR: 500000.0,
      MATERIAL: 400000.0,
      EQUIPMENT: 200000.0,
      SUBCONTRACT: 300000.0,
      OTHER: 100000.0,
    },
  })
  breakdown!: { [key in BudgetCategory]: number };
}

/**
 * Budget Cost Code Breakdown Item
 */
export class BudgetCostCodeBreakdownItemDto {
  @ApiProperty({
    description: 'Cost code ID',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  costCodeId!: string;

  @ApiProperty({
    description: 'Cost code',
    example: '01-1000',
  })
  costCode!: string;

  @ApiProperty({
    description: 'Cost code name',
    example: 'General Requirements',
  })
  costCodeName!: string;

  @ApiProperty({
    description: 'Total budgeted cost',
    example: 250000.0,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of line items',
    example: 5,
  })
  lineItemCount!: number;
}

/**
 * Budget Cost Code Breakdown DTO
 *
 * Breakdown of budgeted costs by cost code.
 */
export class BudgetCostCodeBreakdownDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Cost code breakdown',
    type: [BudgetCostCodeBreakdownItemDto],
  })
  breakdown!: BudgetCostCodeBreakdownItemDto[];
}
