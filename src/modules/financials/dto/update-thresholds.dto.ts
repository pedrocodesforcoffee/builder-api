import { IsArray, ValidateNested, IsNumber, IsString, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Threshold Item DTO
 *
 * Represents a single approval threshold configuration.
 */
export class ThresholdItemDto {
  @ApiProperty({
    description: 'Minimum amount for this threshold',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  minAmount!: number;

  @ApiProperty({
    description: 'Maximum amount for this threshold (null = unlimited)',
    example: 10000,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number | null;

  @ApiProperty({
    description: 'Required role for approval',
    example: 'PROJECT_MANAGER',
  })
  @IsString()
  requiredRole!: string;

  @ApiProperty({
    description: 'Whether owner approval is required',
    example: false,
  })
  @IsBoolean()
  requiresOwnerApproval!: boolean;
}

/**
 * Update Thresholds DTO
 *
 * Updates approval thresholds for a project.
 * Replaces all existing thresholds with the provided configuration.
 */
export class UpdateThresholdsDto {
  @ApiProperty({
    description: 'Array of approval thresholds',
    type: [ThresholdItemDto],
    example: [
      {
        minAmount: 0,
        maxAmount: 10000,
        requiredRole: 'PROJECT_MANAGER',
        requiresOwnerApproval: false,
      },
      {
        minAmount: 10000,
        maxAmount: 50000,
        requiredRole: 'DIRECTOR',
        requiresOwnerApproval: true,
      },
      {
        minAmount: 50000,
        maxAmount: null,
        requiredRole: 'VP',
        requiresOwnerApproval: true,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThresholdItemDto)
  thresholds!: ThresholdItemDto[];
}
