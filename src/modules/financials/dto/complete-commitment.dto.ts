import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for marking a commitment as complete
 */
export class CompleteCommitmentDto {
  /**
   * Optional completion notes
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
