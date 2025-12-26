import { IsNotEmpty, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for marking a payment application as paid
 *
 * Transitions from APPROVED → PAID
 * Updates commitment.paidAmount
 */
export class MarkPaymentApplicationPaidDto {
  /**
   * Payment date (required)
   */
  @IsDateString()
  @IsNotEmpty()
  paidDate!: string;

  /**
   * Optional payment notes
   * Example: check number, wire transfer ID, etc.
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
