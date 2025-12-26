import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Approval Threshold Response DTO
 *
 * Response DTO for approval threshold entities.
 * Defines approval routing rules based on change order amounts.
 */
export class ApprovalThresholdResponseDto {
  @ApiProperty({
    description: 'Threshold ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  projectId!: string;

  @ApiProperty({
    description: 'Minimum amount for this threshold',
    example: 0,
  })
  @Expose()
  minAmount!: number;

  @ApiProperty({
    description: 'Maximum amount for this threshold (null = unlimited)',
    example: 10000,
    nullable: true,
  })
  @Expose()
  maxAmount?: number | null;

  @ApiProperty({
    description: 'Required role for approval',
    example: 'PROJECT_MANAGER',
  })
  @Expose()
  requiredRole!: string;

  @ApiProperty({
    description: 'Whether owner approval is required',
    example: false,
  })
  @Expose()
  requiresOwnerApproval!: boolean;

  @ApiProperty({
    description: 'Sort order for display',
    example: 0,
  })
  @Expose()
  sortOrder!: number;

  @ApiProperty({
    description: 'Whether this threshold is active',
    example: true,
  })
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
