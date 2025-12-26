import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * Reverse Accrual DTO
 *
 * Data Transfer Object for reversing an active accrual.
 * Reversing creates an offsetting entry to neutralize the original accrual's
 * impact on budget actualCost, effectively removing it from financial reporting.
 *
 * **Use Cases:**
 * - Invoice received with significantly different amount than estimated
 * - Original estimate was incorrect and needs to be removed
 * - Work was not completed and accrual is no longer valid
 * - Cost will not be incurred and estimate should be removed
 *
 * **Business Rules:**
 * - Only accruals with status ACTIVE can be reversed
 * - Reversal reason is mandatory for audit trail
 * - Reversal creates an offsetting entry with negative amount
 * - Status changes: ACTIVE → REVERSED
 * - Original accrual remains in database with REVERSED status
 * - Reversal information (timestamp, user, reason) is recorded
 * - Budget actualCost is automatically adjusted (reduced)
 *
 * **Important Notes:**
 * - Reversals are permanent and cannot be undone
 * - If you need to correct an amount, consider updating instead
 * - If invoice arrives, use convert operation instead of reverse
 * - Reversed accruals are excluded from financial reports
 *
 * @class ReverseAccrualDto
 */
export class ReverseAccrualDto {
  /**
   * Reason for reversing the accrual
   *
   * Detailed explanation of why the accrual is being reversed.
   * This is mandatory for audit trail and must be meaningful.
   * Should explain the business reason and context.
   *
   * @example 'Invoice received showing actual cost of $12,000 instead of estimated $15,000. Creating new cost entry with actual amount.'
   */
  @ApiProperty({
    description:
      'Detailed reason for reversing the accrual - mandatory for audit trail (10-2000 characters)',
    example:
      'Invoice received showing actual cost of $12,000 instead of estimated $15,000. Creating new cost entry with actual amount.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString({ message: 'Reversal reason must be a string' })
  @IsNotEmpty({ message: 'Reversal reason is required' })
  @MinLength(10, { message: 'Reversal reason must be at least 10 characters for audit trail' })
  @MaxLength(2000, { message: 'Reversal reason cannot exceed 2000 characters' })
  reversalReason!: string;
}
