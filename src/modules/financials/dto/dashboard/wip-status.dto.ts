import { ApiProperty } from '@nestjs/swagger';

/**
 * WIP Status DTO
 *
 * Work-in-Progress status showing billing vs cost vs earned revenue.
 */
export class WIPStatusDto {
  @ApiProperty({ description: 'Total amount billed to date', example: 6200000 })
  totalBilled: number;

  @ApiProperty({ description: 'Total cost incurred to date', example: 5850000 })
  totalCost: number;

  @ApiProperty({ description: 'Earned revenue based on percent complete', example: 5850000 })
  earnedRevenue: number;

  @ApiProperty({ description: 'Under/over billed amount (billed - earned)', example: 350000 })
  underOverBilled: number;

  @ApiProperty({ description: 'Billing percentage (billed / earned * 100)', example: 106.0 })
  billingPercent: number;
}
