import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a commitment
 */
export class RejectCommitmentDto {
  /**
   * Reason for rejection (required)
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
