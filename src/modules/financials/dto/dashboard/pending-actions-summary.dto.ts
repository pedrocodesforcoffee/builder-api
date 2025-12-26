import { ApiProperty } from '@nestjs/swagger';

class PendingActionItem {
  @ApiProperty({ description: 'Item ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Item type', enum: ['PAYMENT_APPLICATION', 'CHANGE_ORDER', 'COMMITMENT'], example: 'PAYMENT_APPLICATION' })
  type: 'PAYMENT_APPLICATION' | 'CHANGE_ORDER' | 'COMMITMENT';

  @ApiProperty({ description: 'Item title/description', example: 'Payment Application #2 - ABC Steel Corporation' })
  title: string;

  @ApiProperty({ description: 'Current status', example: 'PENDING_APPROVAL' })
  status: string;

  @ApiProperty({ description: 'Amount (optional)', example: 450000, required: false })
  amount?: number;

  @ApiProperty({ description: 'Created date', example: '2024-01-15T10:30:00Z' })
  createdAt: string;
}

/**
 * Pending Actions Summary DTO
 *
 * Summary of items requiring attention (approvals, reviews, etc.).
 */
export class PendingActionsSummaryDto {
  @ApiProperty({ description: 'Total count of pending items', example: 12 })
  totalCount: number;

  @ApiProperty({ description: 'Count of pending payment applications', example: 5 })
  pendingPaymentApplications: number;

  @ApiProperty({ description: 'Count of pending change orders', example: 4 })
  pendingChangeOrders: number;

  @ApiProperty({ description: 'Count of pending commitments', example: 3 })
  pendingCommitments: number;

  @ApiProperty({ description: 'List of recent pending items (up to 10)', type: [PendingActionItem] })
  items: PendingActionItem[];
}
