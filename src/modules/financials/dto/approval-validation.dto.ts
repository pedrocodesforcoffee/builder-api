import { ApiProperty } from '@nestjs/swagger';

/**
 * Approval Validation DTO
 *
 * Validates whether a change order has received all required approvals
 * based on its amount and the project's approval thresholds.
 */
export class ApprovalValidationDto {
  @ApiProperty({
    description: 'Change order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  changeOrderId!: string;

  @ApiProperty({
    description: 'Change order type (OCO or CCO)',
    example: 'OCO',
    enum: ['OCO', 'CCO'],
  })
  changeOrderType!: 'OCO' | 'CCO';

  @ApiProperty({
    description: 'Change order amount',
    example: 25000,
  })
  amount!: number;

  @ApiProperty({
    description: 'Whether all required approvals have been received',
    example: true,
  })
  isValid!: boolean;

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
    description: 'Whether role approval has been received',
    example: true,
  })
  hasRoleApproval!: boolean;

  @ApiProperty({
    description: 'Whether owner approval has been received (if required)',
    example: true,
  })
  hasOwnerApproval!: boolean;

  @ApiProperty({
    description: 'User ID who approved (if approved)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  approvedById?: string | null;

  @ApiProperty({
    description: 'Approval timestamp (if approved)',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  approvedAt?: Date | null;

  @ApiProperty({
    description: 'Validation errors or missing approvals',
    type: 'array',
    items: { type: 'string' },
    example: ['Owner approval required but not received'],
  })
  validationErrors!: string[];
}
