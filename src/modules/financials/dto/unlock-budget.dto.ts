import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Unlock Budget DTO
 *
 * Request to unlock a budget.
 */
export class UnlockBudgetDto {
  @ApiProperty({
    description: 'Reason for unlocking (optional)',
    required: false,
    example: 'Budget review completed',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Unlock Budget Response DTO
 *
 * Response after successfully unlocking a budget.
 */
export class UnlockBudgetResponseDto {
  @ApiProperty({
    description: 'Whether the unlock was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Message',
    example: 'Budget unlocked successfully',
  })
  message!: string;
}
