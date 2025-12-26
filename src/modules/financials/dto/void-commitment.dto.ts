import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for voiding a commitment
 */
export class VoidCommitmentDto {
  /**
   * Reason for voiding (required)
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
