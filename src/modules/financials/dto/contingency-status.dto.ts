import { ApiProperty } from '@nestjs/swagger';

/**
 * Contingency Status DTO
 *
 * Tracks contingency allocation and usage for a budget.
 */
export class ContingencyStatusDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Total contingency allocated',
    example: 150000.0,
  })
  totalContingency!: number;

  @ApiProperty({
    description: 'Contingency used',
    example: 75000.0,
  })
  contingencyUsed!: number;

  @ApiProperty({
    description: 'Contingency remaining',
    example: 75000.0,
  })
  contingencyRemaining!: number;

  @ApiProperty({
    description: 'Contingency percentage of total budget',
    example: 10.0,
  })
  contingencyPercentage!: number;

  @ApiProperty({
    description: 'Contingency usage percentage',
    example: 50.0,
  })
  usagePercentage!: number;

  @ApiProperty({
    description: 'Number of line items using contingency',
    example: 5,
  })
  lineItemsUsingContingency!: number;
}
