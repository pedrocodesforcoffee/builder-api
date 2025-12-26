import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for submitting a commitment for approval
 */
export class SubmitCommitmentDto {
  /**
   * Optional notes to include with the submission
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
