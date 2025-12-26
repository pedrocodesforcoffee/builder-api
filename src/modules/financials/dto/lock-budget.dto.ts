import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Lock Budget DTO
 *
 * Request to lock a budget for editing.
 * The budget will be locked to the requesting user.
 */
export class LockBudgetDto {
  @ApiProperty({
    description: 'Reason for locking (optional)',
    required: false,
    example: 'Performing monthly budget review',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Lock Budget Response DTO
 *
 * Response after successfully locking a budget.
 */
export class LockBudgetResponseDto {
  @ApiProperty({
    description: 'Whether the lock was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'User ID who locked the budget',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  lockedById!: string;

  @ApiProperty({
    description: 'Timestamp when locked',
    example: '2024-01-15T10:30:00Z',
  })
  lockedAt!: Date;

  @ApiProperty({
    description: 'Message',
    example: 'Budget locked successfully',
  })
  message!: string;
}
