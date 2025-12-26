import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for approving a payment application
 *
 * Transitions from UNDER_REVIEW → APPROVED
 * Updates commitment.invoicedAmount and budget line item actualCost
 */
export class ApprovePaymentApplicationDto {
  /**
   * Optional approval notes
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
