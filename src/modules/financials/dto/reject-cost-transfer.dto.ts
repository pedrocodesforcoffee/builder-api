import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Reject Cost Transfer DTO
 *
 * Data Transfer Object for rejecting a cost transfer request.
 *
 * Workflow action: PENDING_APPROVAL → REJECTED
 *
 * When a cost transfer is rejected, it cannot be resubmitted.
 * A new cost transfer request must be created if the requester
 * wishes to pursue a similar budget reallocation.
 *
 * The rejection reason is required to provide feedback to the
 * requester and maintain a clear audit trail of decision-making.
 */
export class RejectCostTransferDto {
  /**
   * Rejection Reason
   * Detailed explanation for why this cost transfer was rejected
   * Must be at least 10 characters to ensure adequate explanation
   */
  @ApiProperty({
    description: 'Detailed reason for rejecting the cost transfer (minimum 10 characters)',
    example: 'Insufficient budget available in target cost code. Please review with project manager before resubmitting.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  rejectionReason!: string;
}
