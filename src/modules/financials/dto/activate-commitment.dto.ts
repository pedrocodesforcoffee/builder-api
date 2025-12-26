import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for activating a commitment
 */
export class ActivateCommitmentDto {
  /**
   * Optional activation notes
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
