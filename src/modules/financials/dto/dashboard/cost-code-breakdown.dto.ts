import { ApiProperty } from '@nestjs/swagger';

/**
 * Cost Code Breakdown DTO
 *
 * Detailed breakdown of costs by cost code.
 */
export class CostCodeBreakdownDto {
  @ApiProperty({ description: 'Cost code ID', example: 'uuid' })
  costCodeId: string;

  @ApiProperty({ description: 'Cost code', example: '03-30-00' })
  code: string;

  @ApiProperty({ description: 'Cost code description', example: 'Cast-in-Place Concrete' })
  description: string;

  @ApiProperty({ description: 'CSI division', example: '03' })
  division: string;

  @ApiProperty({ description: 'Budget amount', example: 500000 })
  budget: number;

  @ApiProperty({ description: 'Committed amount', example: 450000 })
  committed: number;

  @ApiProperty({ description: 'Actual cost', example: 320000 })
  actual: number;

  @ApiProperty({ description: 'Variance (budget - actual)', example: 180000 })
  variance: number;

  @ApiProperty({ description: 'Percent complete', example: 64.0 })
  percentComplete: number;
}
