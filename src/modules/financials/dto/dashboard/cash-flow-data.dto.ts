import { ApiProperty } from '@nestjs/swagger';

/**
 * Cash Flow Data DTO
 *
 * Time series data for cash flow analysis (inflow vs outflow).
 */
export class CashFlowDataDto {
  @ApiProperty({ description: 'Time periods (e.g., months)', example: ['2024-01', '2024-02', '2024-03'] })
  periods: string[];

  @ApiProperty({ description: 'Cash inflow per period (payment applications received)', example: [1200000, 1500000, 1800000] })
  inflow: number[];

  @ApiProperty({ description: 'Cash outflow per period (vendor payments, costs)', example: [950000, 1100000, 1300000] })
  outflow: number[];

  @ApiProperty({ description: 'Net cash flow per period (inflow - outflow)', example: [250000, 400000, 500000] })
  netCashFlow: number[];

  @ApiProperty({ description: 'Cumulative cash flow', example: [250000, 650000, 1150000] })
  cumulativeCashFlow: number[];
}
