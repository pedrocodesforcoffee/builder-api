import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Update Accrual DTO
 *
 * Data Transfer Object for updating an existing accrual.
 * All fields are optional, allowing for partial updates.
 *
 * **Important Constraints:**
 * - Only accruals with status ACTIVE can be updated
 * - REVERSED, CONVERTED, or VOID accruals cannot be modified
 * - Cannot change projectId, budgetId, or costCodeId after creation
 * - Validation rules apply to any fields that are provided
 *
 * **Business Rules:**
 * - Estimated cost must be positive if provided
 * - Description must be meaningful if provided (minimum 10 characters)
 * - If commitment is changed, new commitment must be ACTIVE
 * - If cost period is changed, new period must be OPEN
 * - Updates trigger recalculation of budget actualCost
 *
 * **Note:** This DTO intentionally excludes projectId, budgetId, and costCodeId
 * as these are immutable after creation to maintain audit trail integrity.
 *
 * @class UpdateAccrualDto
 */
export class UpdateAccrualDto {
  /**
   * Description of the accrued cost
   *
   * Clear explanation of what cost is being accrued and why.
   * If updating, must still meet minimum length requirement.
   *
   * @example 'Updated: Estimated subcontractor labor for foundation work - revised estimate'
   */
  @ApiPropertyOptional({
    description: 'Updated description of the accrued cost - minimum 10 characters if provided',
    example: 'Updated: Estimated subcontractor labor for foundation work - revised estimate',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description?: string;

  /**
   * Estimated cost amount
   *
   * Updated estimated amount of the unbilled cost.
   * Must be positive if provided.
   *
   * @example 18500.00
   */
  @ApiPropertyOptional({
    description: 'Updated estimated cost amount - must be positive if provided (minimum 0.01)',
    example: 18500.0,
    minimum: 0.01,
    type: 'number',
    format: 'decimal',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Estimated cost must be a valid number with max 2 decimal places' },
  )
  @Min(0.01, { message: 'Estimated cost must be at least 0.01' })
  estimatedCost?: number;

  /**
   * Accrual date
   *
   * Updated date when the cost was incurred or recognized.
   * Typically should not be in the future.
   *
   * @example '2025-12-01'
   */
  @ApiPropertyOptional({
    description: 'Updated accrual date - date when cost was incurred (ISO 8601 format)',
    example: '2025-12-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Accrual date must be a valid ISO 8601 date string' })
  accrualDate?: Date;

  /**
   * Commitment UUID (optional)
   *
   * Updated commitment link (subcontract or purchase order).
   * If provided, the commitment must be in ACTIVE status.
   * Set to null to remove commitment association.
   *
   * @example '423e4567-e89b-12d3-a456-426614174003'
   */
  @ApiPropertyOptional({
    description: 'Updated Commitment UUID - links accrual to subcontract/PO (must be ACTIVE)',
    example: '423e4567-e89b-12d3-a456-426614174003',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Commitment ID must be a valid UUID v4' })
  commitmentId?: string;

  /**
   * Cost Period UUID (optional)
   *
   * Updated cost period association for reporting.
   * If provided, the period must be in OPEN status.
   * Set to null to remove period association.
   *
   * @example '523e4567-e89b-12d3-a456-426614174004'
   */
  @ApiPropertyOptional({
    description: 'Updated Cost Period UUID - for period-based reporting (must be OPEN)',
    example: '523e4567-e89b-12d3-a456-426614174004',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cost Period ID must be a valid UUID v4' })
  costPeriodId?: string;

  /**
   * Additional notes (optional)
   *
   * Updated additional information or context about the accrual.
   * Set to null or empty string to clear notes.
   *
   * @example 'Revised estimate based on updated scope discussions'
   */
  @ApiPropertyOptional({
    description: 'Updated additional notes or comments',
    example: 'Revised estimate based on updated scope discussions',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes cannot exceed 5000 characters' })
  notes?: string;
}
