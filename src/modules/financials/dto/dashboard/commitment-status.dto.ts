import { ApiProperty } from '@nestjs/swagger';

class StatusSummaryItem {
  @ApiProperty({ description: 'Commitment status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Count of commitments in this status', example: 15 })
  count: number;

  @ApiProperty({ description: 'Total amount for this status', example: 7800000 })
  amount: number;
}

/**
 * Commitment Status DTO
 *
 * Summary of commitments grouped by status for pie chart visualization.
 */
export class CommitmentStatusDto {
  @ApiProperty({ description: 'Total number of commitments', example: 25 })
  totalCommitments: number;

  @ApiProperty({ description: 'Total commitment amount', example: 9500000 })
  totalAmount: number;

  @ApiProperty({ description: 'Breakdown by status', type: [StatusSummaryItem] })
  byStatus: StatusSummaryItem[];
}
