import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

/**
 * Create Accrual DTO
 *
 * Data Transfer Object for creating a new accrual (unbilled cost estimate).
 * Accruals are used to recognize estimated costs that have been incurred but
 * not yet formally invoiced, providing more accurate budget tracking and
 * financial reporting.
 *
 * **Business Rules:**
 * - All required fields must be provided
 * - Estimated cost must be positive (minimum 0.01)
 * - Description must be meaningful (minimum 10 characters)
 * - Project, Budget, and Cost Code must exist and be related
 * - Accrual date cannot be in the future
 * - If commitment is provided, it must be ACTIVE
 * - If cost period is provided, it must be OPEN
 *
 * **Lifecycle:**
 * - Created accruals start with status ACTIVE
 * - Auto-generates accrual number (AC-YYYY-XXXXX)
 * - Affects budget actualCost immediately upon creation
 *
 * @class CreateAccrualDto
 */
export class CreateAccrualDto {
  /**
   * Project UUID
   *
   * The project to which this accrual belongs.
   * Must be a valid, active project.
   *
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  @ApiProperty({
    description: 'Project UUID - must be valid and active',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Project ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Project ID is required' })
  projectId!: string;

  /**
   * Budget UUID
   *
   * The budget under which this accrual is recorded.
   * Must belong to the specified project.
   *
   * @example '223e4567-e89b-12d3-a456-426614174001'
   */
  @ApiProperty({
    description: 'Budget UUID - must belong to the specified project',
    example: '223e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Budget ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Budget ID is required' })
  budgetId!: string;

  /**
   * Cost Code UUID
   *
   * The cost code to which this accrual is allocated.
   * Must be a valid cost code in the project's budget.
   *
   * @example '323e4567-e89b-12d3-a456-426614174002'
   */
  @ApiProperty({
    description: 'Cost Code UUID - must be valid in the project budget',
    example: '323e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Cost Code ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Cost Code ID is required' })
  costCodeId!: string;

  /**
   * Description of the accrued cost
   *
   * Clear explanation of what cost is being accrued and why.
   * Should provide context for future reference.
   *
   * @example 'Estimated subcontractor labor for foundation work completed in November'
   */
  @ApiProperty({
    description: 'Description of the accrued cost - minimum 10 characters',
    example: 'Estimated subcontractor labor for foundation work completed in November',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description!: string;

  /**
   * Estimated cost amount
   *
   * The estimated amount of the unbilled cost.
   * Must be positive and will affect budget actualCost.
   *
   * @example 15000.00
   */
  @ApiProperty({
    description: 'Estimated cost amount - must be positive (minimum 0.01)',
    example: 15000.0,
    minimum: 0.01,
    type: 'number',
    format: 'decimal',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Estimated cost must be a valid number with max 2 decimal places' },
  )
  @IsNotEmpty({ message: 'Estimated cost is required' })
  @Min(0.01, { message: 'Estimated cost must be at least 0.01' })
  estimatedCost!: number;

  /**
   * Accrual date
   *
   * The date when the cost was incurred or recognized.
   * Typically should not be in the future.
   *
   * @example '2025-11-30'
   */
  @ApiProperty({
    description: 'Accrual date - date when cost was incurred (ISO 8601 format)',
    example: '2025-11-30',
    type: 'string',
    format: 'date',
  })
  @IsDateString({}, { message: 'Accrual date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Accrual date is required' })
  accrualDate!: Date;

  /**
   * Commitment UUID (optional)
   *
   * Links the accrual to a specific commitment (subcontract or purchase order).
   * If provided, the commitment must be in ACTIVE status.
   *
   * @example '423e4567-e89b-12d3-a456-426614174003'
   */
  @ApiPropertyOptional({
    description: 'Optional Commitment UUID - links accrual to subcontract/PO (must be ACTIVE)',
    example: '423e4567-e89b-12d3-a456-426614174003',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Commitment ID must be a valid UUID v4' })
  commitmentId?: string;

  /**
   * Cost Period UUID (optional)
   *
   * Associates the accrual with a specific cost period for reporting.
   * If provided, the period must be in OPEN status.
   *
   * @example '523e4567-e89b-12d3-a456-426614174004'
   */
  @ApiPropertyOptional({
    description: 'Optional Cost Period UUID - for period-based reporting (must be OPEN)',
    example: '523e4567-e89b-12d3-a456-426614174004',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cost Period ID must be a valid UUID v4' })
  costPeriodId?: string;

  /**
   * Additional notes (optional)
   *
   * Any additional information or context about the accrual.
   *
   * @example 'Follow up with ABC Contractors for final invoice'
   */
  @ApiPropertyOptional({
    description: 'Optional additional notes or comments',
    example: 'Follow up with ABC Contractors for final invoice',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes cannot exceed 5000 characters' })
  notes?: string;
}
