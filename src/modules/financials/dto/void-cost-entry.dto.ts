import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * Void Cost Entry DTO
 *
 * Data Transfer Object for voiding a posted cost entry.
 *
 * Voiding a cost entry reverses its impact on the budget's actual cost.
 * This is the only way to "undo" a posted cost entry without deleting
 * the record, maintaining a complete audit trail.
 *
 * A void reason is required to document why the entry is being reversed,
 * which is important for accounting and audit purposes.
 *
 * Only cost entries in POSTED status can be voided.
 */
export class VoidCostEntryDto {
  /**
   * Void Reason
   * Explanation for why this cost entry is being voided
   * Minimum 10 characters to ensure meaningful documentation
   */
  @ApiProperty({
    description: 'Reason for voiding the cost entry (minimum 10 characters)',
    example: 'Invoice was incorrect and has been reissued with correct amount',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  voidReason!: string;
}
