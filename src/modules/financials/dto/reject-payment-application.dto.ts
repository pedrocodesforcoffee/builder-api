import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a payment application
 *
 * Transitions from UNDER_REVIEW → REJECTED
 */
export class RejectPaymentApplicationDto {
  /**
   * Rejection reason (required)
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
