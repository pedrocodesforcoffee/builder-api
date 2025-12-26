import { ApiProperty } from '@nestjs/swagger';

/**
 * Earned Value Metrics DTO
 *
 * Earned Value Management (EVM) analysis metrics.
 */
export class EarnedValueMetricsDto {
  @ApiProperty({ description: 'Budget at Completion (BAC)', example: 9750000 })
  budgetAtCompletion: number;

  @ApiProperty({ description: 'Planned Value (PV) - scheduled work value', example: 5850000 })
  plannedValue: number;

  @ApiProperty({ description: 'Earned Value (EV) - completed work value', example: 5850000 })
  earnedValue: number;

  @ApiProperty({ description: 'Actual Cost (AC) - actual cost incurred', example: 5850000 })
  actualCost: number;

  @ApiProperty({ description: 'Schedule Variance (SV = EV - PV)', example: 0 })
  scheduleVariance: number;

  @ApiProperty({ description: 'Cost Variance (CV = EV - AC)', example: 0 })
  costVariance: number;

  @ApiProperty({ description: 'Schedule Performance Index (SPI = EV / PV)', example: 1.0 })
  schedulePerformanceIndex: number;

  @ApiProperty({ description: 'Cost Performance Index (CPI = EV / AC)', example: 1.0 })
  costPerformanceIndex: number;

  @ApiProperty({ description: 'Estimate at Completion (EAC)', example: 9750000 })
  estimateAtCompletion: number;

  @ApiProperty({ description: 'Estimate to Complete (ETC = EAC - AC)', example: 3900000 })
  estimateToComplete: number;

  @ApiProperty({ description: 'Variance at Completion (VAC = BAC - EAC)', example: 0 })
  varianceAtCompletion: number;

  @ApiProperty({ description: 'Schedule health status', enum: ['ON_TRACK', 'AT_RISK', 'BEHIND'], example: 'ON_TRACK' })
  scheduleHealth: 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

  @ApiProperty({ description: 'Cost health status', enum: ['UNDER_BUDGET', 'ON_BUDGET', 'OVER_BUDGET'], example: 'ON_BUDGET' })
  costHealth: 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET';
}
