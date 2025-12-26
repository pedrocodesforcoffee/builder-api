import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * WIP Report Request DTO
 * Generates Work in Progress report with over/under billing analysis
 */
export class GenerateWIPReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'As-of date for snapshot (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;
}

/**
 * WIP Line Item
 * Single cost code in the WIP report
 */
export class WIPLineDto {
  @ApiProperty({ description: 'Cost code' })
  costCode!: string;

  @ApiProperty({ description: 'Cost code description' })
  description!: string;

  @ApiProperty({ description: 'Contract value allocated to this cost code' })
  contractValue!: number;

  @ApiProperty({ description: 'Revised budget' })
  revisedBudget!: number;

  @ApiProperty({ description: 'Actual cost to date' })
  actualCost!: number;

  @ApiProperty({ description: 'Percent complete (actual / revised * 100)' })
  percentComplete!: number;

  @ApiProperty({ description: 'Earned revenue (percent complete * contract value)' })
  earnedRevenue!: number;

  @ApiProperty({ description: 'Billed to date (from payment applications)' })
  billedToDate!: number;

  @ApiProperty({ description: 'Under/Over billing (earned - billed, positive = under)' })
  underOverBilling!: number;
}

/**
 * WIP Report Result
 */
export class WIPReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total contract value' })
  totalContractValue!: number;

  @ApiProperty({ description: 'Total revised budget' })
  totalRevisedBudget!: number;

  @ApiProperty({ description: 'Total actual cost' })
  totalActualCost!: number;

  @ApiProperty({ description: 'Total percent complete' })
  totalPercentComplete!: number;

  @ApiProperty({ description: 'Total earned revenue' })
  totalEarnedRevenue!: number;

  @ApiProperty({ description: 'Total billed to date' })
  totalBilledToDate!: number;

  @ApiProperty({ description: 'Total under/over billing' })
  totalUnderOverBilling!: number;

  @ApiProperty({ description: 'Estimated profit' })
  estimatedProfit!: number;

  @ApiProperty({ description: 'Estimated profit margin (%)' })
  estimatedProfitMargin!: number;

  @ApiProperty({ description: 'WIP lines', type: [WIPLineDto] })
  lines!: WIPLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
