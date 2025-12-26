import { ApiProperty } from '@nestjs/swagger';

/**
 * Line Item Change Detail
 */
export class LineItemChangeDto {
  @ApiProperty({
    description: 'Cost code',
    example: '01.02.03',
  })
  costCode!: string;

  @ApiProperty({
    description: 'Cost code name',
    example: 'Concrete Work',
  })
  costCodeName!: string;

  @ApiProperty({
    description: 'Baseline amount from snapshot',
    example: 37500.0,
  })
  baselineAmount!: number;

  @ApiProperty({
    description: 'Comparison amount from current budget',
    example: 42000.0,
  })
  comparisonAmount!: number;

  @ApiProperty({
    description: 'Difference (comparison - baseline)',
    example: 4500.0,
  })
  difference!: number;

  @ApiProperty({
    description: 'Percentage change',
    example: 12.0,
  })
  percentChange!: number;

  @ApiProperty({
    description: 'Type of change',
    enum: ['added', 'removed', 'changed', 'unchanged'],
    example: 'changed',
  })
  changeType!: 'added' | 'removed' | 'changed' | 'unchanged';
}

/**
 * Baseline Budget Info
 */
export class BaselineBudgetDto {
  @ApiProperty({
    description: 'Budget or snapshot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Budget or snapshot name',
    example: 'Baseline Snapshot',
  })
  name!: string;

  @ApiProperty({
    description: 'Total budget amount',
    example: 1500000.0,
  })
  totalBudget!: number;

  @ApiProperty({
    description: 'Snapshot date (if comparing to snapshot)',
    example: '2025-01-15T10:30:00Z',
    required: false,
  })
  snapshotDate?: string;
}

/**
 * Comparison Budget Info
 */
export class ComparisonBudgetDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Budget name',
    example: '2024 Original Budget',
  })
  name!: string;

  @ApiProperty({
    description: 'Total budget amount',
    example: 1600000.0,
  })
  totalBudget!: number;

  @ApiProperty({
    description: 'Snapshot date (null for current budget)',
    required: false,
    nullable: true,
  })
  snapshotDate?: string | null;
}

/**
 * Snapshot Variance Analysis
 */
export class SnapshotVarianceDto {
  @ApiProperty({
    description: 'Total difference (comparison - baseline)',
    example: 100000.0,
  })
  totalDifference!: number;

  @ApiProperty({
    description: 'Percentage change',
    example: 6.67,
  })
  percentChange!: number;

  @ApiProperty({
    description: 'Line item changes',
    type: [LineItemChangeDto],
  })
  lineItemChanges!: LineItemChangeDto[];
}

/**
 * Budget Snapshot Comparison DTO
 *
 * Comprehensive comparison between a budget snapshot (historical state)
 * and the current budget state, showing all variances at line-item level.
 */
export class BudgetSnapshotComparisonDto {
  @ApiProperty({
    description: 'Baseline budget information (from snapshot)',
    type: BaselineBudgetDto,
  })
  baseline!: BaselineBudgetDto;

  @ApiProperty({
    description: 'Comparison budget information (current state)',
    type: ComparisonBudgetDto,
  })
  comparison!: ComparisonBudgetDto;

  @ApiProperty({
    description: 'Variance analysis with line item changes',
    type: SnapshotVarianceDto,
  })
  variance!: SnapshotVarianceDto;
}
