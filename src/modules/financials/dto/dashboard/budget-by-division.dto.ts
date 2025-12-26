import { ApiProperty } from '@nestjs/swagger';

class DivisionBreakdown {
  @ApiProperty({ description: 'CSI division code', example: '03' })
  divisionCode: string;

  @ApiProperty({ description: 'Division name', example: 'Concrete' })
  divisionName: string;

  @ApiProperty({ description: 'Original budget for division', example: 1500000 })
  originalBudget: number;

  @ApiProperty({ description: 'Revised budget for division', example: 1550000 })
  revisedBudget: number;

  @ApiProperty({ description: 'Committed amount for division', example: 1400000 })
  committed: number;

  @ApiProperty({ description: 'Actual cost for division', example: 950000 })
  actual: number;

  @ApiProperty({ description: 'Variance for division (revised - actual)', example: 600000 })
  variance: number;
}

/**
 * Budget by Division DTO
 *
 * Budget breakdown by CSI MasterFormat division for bar chart visualization.
 */
export class BudgetByDivisionDto {
  @ApiProperty({ description: 'Budget breakdown by division', type: [DivisionBreakdown] })
  divisions: DivisionBreakdown[];
}
