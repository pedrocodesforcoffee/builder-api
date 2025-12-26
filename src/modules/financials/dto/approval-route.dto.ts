import { ApiProperty } from '@nestjs/swagger';

/**
 * Approval Route DTO
 *
 * Defines the approval routing for a change order based on its amount.
 * Determines which threshold applies and what approvals are required.
 */
export class ApprovalRouteDto {
  @ApiProperty({
    description: 'Approval threshold ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  thresholdId!: string;

  @ApiProperty({
    description: 'Minimum amount for this threshold',
    example: 10000,
  })
  minAmount!: number;

  @ApiProperty({
    description: 'Maximum amount for this threshold (null = no limit)',
    example: 50000,
    nullable: true,
  })
  maxAmount!: number | null;

  @ApiProperty({
    description: 'Required role for approval',
    example: 'DIRECTOR',
  })
  requiredRole!: string;

  @ApiProperty({
    description: 'Whether owner approval is required',
    example: true,
  })
  requiresOwnerApproval!: boolean;

  @ApiProperty({
    description: 'Change order amount being evaluated',
    example: 25000,
  })
  changeOrderAmount!: number;

  @ApiProperty({
    description: 'Whether this amount is within threshold range',
    example: true,
  })
  isWithinRange!: boolean;
}
