import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for closing a commitment
 */
export class CloseCommitmentDto {
  /**
   * Optional closing notes
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
