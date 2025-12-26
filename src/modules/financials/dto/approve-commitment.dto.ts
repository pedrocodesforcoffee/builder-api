import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for approving a commitment
 */
export class ApproveCommitmentDto {
  /**
   * Optional approval notes
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
