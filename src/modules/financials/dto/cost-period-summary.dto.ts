import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CostPeriodStatus } from '../enums/cost-period-status.enum';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * Cost Period Summary DTO
 *
 * Summary information for a cost period including aggregated cost entry data.
 * This DTO is returned by the GET /cost-periods/:id/summary endpoint to provide
 * a comprehensive overview of cost activity within a period.
 *
 * Includes:
 * - Basic period information (name, dates, status)
 * - Total count of cost entries in the period
 * - Total cost amount across all entries
 * - Breakdown of entry counts by type (LABOR, MATERIAL, etc.)
 * - Breakdown of entry counts by status (DRAFT, POSTED, VOID)
 *
 * This summary is useful for:
 * - Dashboard widgets showing period activity
 * - Period close validation (ensure all entries are posted)
 * - Cost tracking reports and analytics
 * - Period comparison and trend analysis
 */
export class CostPeriodSummaryDto {
  /**
   * Cost Period UUID
   */
  @ApiProperty({ description: 'Cost period UUID' })
  @Expose()
  periodId!: string;

  /**
   * Period Name
   */
  @ApiProperty({ description: 'Period name (e.g., "January 2025")' })
  @Expose()
  periodName!: string;

  /**
   * Period Start Date
   */
  @ApiProperty({ description: 'Period start date' })
  @Expose()
  periodStart!: Date;

  /**
   * Period End Date
   */
  @ApiProperty({ description: 'Period end date' })
  @Expose()
  periodEnd!: Date;

  /**
   * Period Status
   */
  @ApiProperty({ description: 'Cost period status', enum: CostPeriodStatus })
  @Expose()
  status!: CostPeriodStatus;

  /**
   * Total Cost Entries
   * Total number of cost entries in this period
   */
  @ApiProperty({
    description: 'Total number of cost entries in this period',
    example: 150,
  })
  @Expose()
  totalCostEntries!: number;

  /**
   * Total Amount
   * Sum of all cost entry amounts in this period
   */
  @ApiProperty({
    description: 'Total cost amount across all entries',
    example: 125000.50,
  })
  @Expose()
  totalAmount!: number;

  /**
   * Entry Count By Type
   * Breakdown of cost entry counts grouped by CostEntryType
   */
  @ApiProperty({
    description: 'Count of entries by cost type',
    example: {
      LABOR: 45,
      MATERIAL: 60,
      EQUIPMENT: 20,
      SUBCONTRACT: 15,
      OTHER_DIRECT: 10,
    },
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @Expose()
  entryCountByType!: Record<CostEntryType, number>;

  /**
   * Entry Count By Status
   * Breakdown of cost entry counts grouped by CostEntryStatus
   */
  @ApiProperty({
    description: 'Count of entries by status',
    example: {
      DRAFT: 5,
      POSTED: 140,
      VOID: 5,
    },
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @Expose()
  entryCountByStatus!: Record<CostEntryStatus, number>;
}
