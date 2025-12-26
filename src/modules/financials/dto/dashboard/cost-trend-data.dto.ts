import { ApiProperty } from '@nestjs/swagger';

/**
 * Cost Trend Data DTO
 *
 * Time series data showing budget vs committed vs actual costs over time.
 */
export class CostTrendDataDto {
  @ApiProperty({ description: 'Time periods (e.g., months)', example: ['2024-01', '2024-02', '2024-03'] })
  periods: string[];

  @ApiProperty({ description: 'Budget amount per period', example: [9750000, 9750000, 9750000] })
  budget: number[];

  @ApiProperty({ description: 'Cumulative committed amount per period', example: [5200000, 6800000, 7800000] })
  committed: number[];

  @ApiProperty({ description: 'Cumulative actual cost per period', example: [3900000, 4850000, 5850000] })
  actual: number[];

  @ApiProperty({ description: 'Forecast/projected final cost per period', example: [9750000, 9750000, 9750000] })
  forecast: number[];
}
