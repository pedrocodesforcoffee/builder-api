import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Void Cost Transfer DTO
 *
 * Data Transfer Object for voiding an approved cost transfer.
 *
 * Workflow action: APPROVED → VOID
 *
 * Voiding a cost transfer reverses its effect by creating offsetting
 * cost entries that cancel out the original transfer entries.
 *
 * When a cost transfer is voided, the system creates two new CostEntry records:
 * - One crediting (positive) the fromCostCode to restore the original amount
 * - One debiting (negative) the toCostCode to remove the transferred amount
 *
 * The original cost entries remain in the system for audit purposes,
 * but are effectively reversed by these new offsetting entries.
 *
 * A void reason is required to document why the reversal is necessary.
 */
export class VoidCostTransferDto {
  /**
   * Void Reason
   * Detailed explanation for why this cost transfer is being voided
   * Must be at least 10 characters to ensure adequate justification
   */
  @ApiProperty({
    description: 'Detailed reason for voiding the cost transfer (minimum 10 characters)',
    example: 'Voiding due to accounting error discovered during month-end reconciliation. Original transfer will be corrected in new request.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  voidReason!: string;
}
