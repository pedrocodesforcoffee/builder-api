import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

/**
 * Convert Accrual DTO
 *
 * Data Transfer Object for converting an active accrual to an actual cost entry.
 * This operation is used when the actual invoice or cost information is received,
 * replacing the estimated accrual with real cost data.
 *
 * **Conversion Process:**
 * 1. Validates accrual is in ACTIVE status
 * 2. Creates a new CostEntry with actual cost information
 * 3. Reverses the original accrual amount from budget
 * 4. Adds the actual cost to budget
 * 5. Links the cost entry to the accrual via convertedEntryId
 * 6. Changes accrual status: ACTIVE → CONVERTED
 * 7. Records conversion timestamp and user
 *
 * **Business Rules:**
 * - Only accruals with status ACTIVE can be converted
 * - If actualCost is not provided, uses estimatedCost from accrual
 * - Created cost entry inherits project, budget, costCode from accrual
 * - Created cost entry is automatically in POSTED status
 * - Conversion is permanent and cannot be undone
 * - Budget actualCost is adjusted by difference (actual - estimated)
 *
 * **Use Cases:**
 * - Invoice received for accrued work
 * - Final cost confirmed and differs from estimate
 * - Moving from estimated to actual cost tracking
 *
 * @class ConvertAccrualDto
 */
export class ConvertAccrualDto {
  /**
   * Actual cost amount (optional)
   *
   * The actual cost from the received invoice or confirmed amount.
   * If not provided, defaults to the estimatedCost from the original accrual.
   * Must be positive if provided.
   *
   * **Note:** If actual cost differs from estimated, the budget actualCost
   * will be adjusted by the difference.
   *
   * @example 18500.00
   */
  @ApiPropertyOptional({
    description:
      'Actual cost amount - defaults to estimatedCost if not provided (must be positive, minimum 0.01)',
    example: 18500.0,
    minimum: 0.01,
    type: 'number',
    format: 'decimal',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Actual cost must be a valid number with max 2 decimal places' },
  )
  @Min(0.01, { message: 'Actual cost must be at least 0.01' })
  actualCost?: number;

  /**
   * Invoice number (optional)
   *
   * Reference to the invoice or billing document that confirms the actual cost.
   * This will be stored in the created cost entry for reference and tracking.
   *
   * @example 'INV-2025-5678'
   */
  @ApiPropertyOptional({
    description: 'Optional invoice number or reference for the actual cost',
    example: 'INV-2025-5678',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Invoice number must be a string' })
  @MaxLength(100, { message: 'Invoice number cannot exceed 100 characters' })
  invoiceNumber?: string;

  /**
   * Vendor name (optional)
   *
   * Name of the vendor who provided the invoice or confirmed cost.
   * This will be stored in the created cost entry for tracking.
   * Useful when accrual was not linked to a specific commitment.
   *
   * @example 'ABC Contractors Inc'
   */
  @ApiPropertyOptional({
    description: 'Optional vendor name for the actual cost',
    example: 'ABC Contractors Inc',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Vendor name must be a string' })
  @MaxLength(255, { message: 'Vendor name cannot exceed 255 characters' })
  vendor?: string;

  /**
   * Additional notes (optional)
   *
   * Any additional information about the conversion or actual cost.
   * This will be appended to the description in the created cost entry.
   *
   * @example 'Final invoice received 12/5/2025 - includes additional materials'
   */
  @ApiPropertyOptional({
    description: 'Optional additional notes about the conversion',
    example: 'Final invoice received 12/5/2025 - includes additional materials',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;
}
