import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Activate Budget DTO
 *
 * Request to activate a budget.
 */
export class ActivateBudgetDto {
  @ApiProperty({
    description: 'Reason for activation (optional)',
    required: false,
    example: 'Approved budget for use',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Activate Budget Response DTO
 *
 * Response after successfully activating a budget.
 */
export class ActivateBudgetResponseDto {
  @ApiProperty({
    description: 'Whether the activation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Budget ID that was activated',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'ID of previous active budget (if any)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174999',
  })
  previousActiveBudgetId?: string;

  @ApiProperty({
    description: 'Message',
    example: 'Budget activated successfully',
  })
  message!: string;
}
