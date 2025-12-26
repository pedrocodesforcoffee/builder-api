import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Update Cost Transfer DTO
 *
 * Data Transfer Object for updating an existing cost transfer.
 *
 * IMPORTANT: Only cost transfers in DRAFT status can be updated.
 * Once a transfer is submitted (PENDING_APPROVAL) or approved (APPROVED),
 * it cannot be modified. If changes are needed after submission,
 * the transfer must be rejected and a new one created.
 *
 * All fields are optional to support partial updates.
 * Only the fields provided will be updated.
 */
export class UpdateCostTransferDto {
  /**
   * From Cost Code UUID (Optional)
   * Update the source cost code to transfer funds FROM
   */
  @ApiPropertyOptional({
    description: 'Source cost code UUID (funds transferred FROM)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  fromCostCodeId?: string;

  /**
   * To Cost Code UUID (Optional)
   * Update the target cost code to transfer funds TO
   */
  @ApiPropertyOptional({
    description: 'Target cost code UUID (funds transferred TO)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  toCostCodeId?: string;

  /**
   * Transfer Amount (Optional)
   * Update the amount to transfer between cost codes
   */
  @ApiPropertyOptional({
    description: 'Amount to transfer between cost codes',
    example: 25000.00,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  /**
   * Transfer Reason (Optional)
   * Update the explanation for this transfer
   */
  @ApiPropertyOptional({
    description: 'Detailed reason for the cost transfer (minimum 10 characters)',
    example: 'Reallocating funds from masonry to electrical due to scope change',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason?: string;
}
