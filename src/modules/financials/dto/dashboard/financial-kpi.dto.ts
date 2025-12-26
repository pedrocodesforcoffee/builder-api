import { ApiProperty } from '@nestjs/swagger';

/**
 * Financial KPI DTO
 *
 * Comprehensive financial Key Performance Indicators for a project.
 */
export class FinancialKPIDto {
  @ApiProperty({ description: 'Original contract value', example: 10000000 })
  originalContractValue: number;

  @ApiProperty({ description: 'Total approved change orders', example: 250000 })
  approvedChangeOrders: number;

  @ApiProperty({ description: 'Current contract value (original + approved COs)', example: 10250000 })
  currentContractValue: number;

  @ApiProperty({ description: 'Original budget amount', example: 9500000 })
  originalBudget: number;

  @ApiProperty({ description: 'Current budget amount (after revisions)', example: 9750000 })
  currentBudget: number;

  @ApiProperty({ description: 'Contingency remaining', example: 475000 })
  contingencyRemaining: number;

  @ApiProperty({ description: 'Contingency as percentage of original budget', example: 5.0 })
  contingencyPercent: number;

  @ApiProperty({ description: 'Total committed amount (active commitments)', example: 7800000 })
  totalCommitted: number;

  @ApiProperty({ description: 'Committed percentage of current budget', example: 80.0 })
  committedPercent: number;

  @ApiProperty({ description: 'Total actual cost to date', example: 5850000 })
  totalActualCost: number;

  @ApiProperty({ description: 'Actual cost percentage of current budget', example: 60.0 })
  actualPercent: number;

  @ApiProperty({ description: 'Budget variance (budget - actual)', example: 3900000 })
  budgetVariance: number;

  @ApiProperty({ description: 'Budget variance as percentage', example: 40.0 })
  budgetVariancePercent: number;

  @ApiProperty({ description: 'Estimate at completion (projected final cost)', example: 9750000 })
  estimateAtCompletion: number;

  @ApiProperty({ description: 'Forecast variance (budget - EAC)', example: 0 })
  forecastVariance: number;

  @ApiProperty({ description: 'Project percent complete', example: 60.0 })
  percentComplete: number;
}
