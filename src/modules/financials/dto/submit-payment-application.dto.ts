import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for submitting a payment application
 *
 * Transitions from DRAFT → SUBMITTED
 */
export class SubmitPaymentApplicationDto {
  /**
   * Optional submission notes
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
