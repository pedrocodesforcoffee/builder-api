import { ApiProperty } from '@nestjs/swagger';

/**
 * Budget Impact DTO
 *
 * Represents the impact of a change order on project budget.
 * Tracks how change orders affect budget line items and totals.
 */
export class BudgetImpactDto {
  @ApiProperty({
    description: 'Change order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  changeOrderId!: string;

  @ApiProperty({
    description: 'Change order type (OCO or CCO)',
    example: 'OCO',
    enum: ['OCO', 'CCO'],
  })
  changeOrderType!: 'OCO' | 'CCO';

  @ApiProperty({
    description: 'Total change order amount',
    example: 25000,
  })
  changeOrderAmount!: number;

  @ApiProperty({
    description: 'Current budget total before change order',
    example: 500000,
  })
  currentBudgetTotal!: number;

  @ApiProperty({
    description: 'Projected budget total after change order',
    example: 525000,
  })
  projectedBudgetTotal!: number;

  @ApiProperty({
    description: 'Budget impact amount (difference)',
    example: 25000,
  })
  budgetImpact!: number;

  @ApiProperty({
    description: 'Percentage impact on budget',
    example: 5.0,
  })
  percentageImpact!: number;

  @ApiProperty({
    description: 'Breakdown by cost code',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        costCodeId: { type: 'string' },
        costCode: { type: 'string' },
        costCodeName: { type: 'string' },
        amount: { type: 'number' },
        currentBudget: { type: 'number' },
        projectedBudget: { type: 'number' },
      },
    },
  })
  costCodeBreakdown!: Array<{
    costCodeId: string;
    costCode: string;
    costCodeName: string;
    amount: number;
    currentBudget: number;
    projectedBudget: number;
  }>;
}
