import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  ValidateBy,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to ensure periodEnd is after periodStart
 */
function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isAfterDate',
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          if (!value || !relatedValue) return true;
          return new Date(value) > new Date(relatedValue);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be after ${relatedPropertyName}`;
        },
      },
    },
    validationOptions,
  );
}

/**
 * Update Cost Period DTO
 *
 * Data Transfer Object for updating an existing cost period.
 * All fields are optional - only provide fields that need to be updated.
 *
 * IMPORTANT: Only OPEN cost periods can be updated.
 * Once a period is CLOSED or LOCKED, it cannot be modified.
 *
 * Restrictions:
 * - CLOSED periods: Cannot be edited (snapshot created)
 * - LOCKED periods: Permanently immutable (audit compliance)
 *
 * Common use cases:
 * - Adjusting period dates before closing
 * - Renaming periods for clarity
 * - Correcting period boundaries
 */
export class UpdateCostPeriodDto {
  /**
   * Period Name (Optional)
   * Human-readable name for the cost period
   */
  @ApiPropertyOptional({
    description: 'Period name (e.g., "January 2025", "Q1 2025")',
    example: 'January 2025',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  periodName?: string;

  /**
   * Period Start Date (Optional)
   * Beginning date of the cost period (ISO 8601 format)
   */
  @ApiPropertyOptional({
    description: 'Period start date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  /**
   * Period End Date (Optional)
   * Ending date of the cost period (ISO 8601 format)
   * Must be after periodStart if both are provided
   */
  @ApiPropertyOptional({
    description: 'Period end date (ISO 8601) - must be after periodStart',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  @IsAfterDate('periodStart', {
    message: 'Period end date must be after period start date',
  })
  periodEnd?: string;
}
