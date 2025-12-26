import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
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
 * Create Cost Period DTO
 *
 * Data Transfer Object for creating a new cost period in the system.
 * Cost periods represent time-based tracking windows (typically monthly) for
 * organizing and controlling cost entries.
 *
 * Cost periods enable:
 * - Period-based cost tracking (monthly, quarterly, etc.)
 * - Cost entry organization by time windows
 * - Period closing workflows (OPEN → CLOSED → LOCKED)
 * - Financial snapshot creation at period close
 * - Immutable historical cost data when locked
 *
 * Workflow:
 * 1. Create period in OPEN status (default)
 * 2. Cost entries can be added to OPEN periods
 * 3. Close period to prevent new entries and create snapshot
 * 4. Lock period for immutable audit trail (cannot reopen)
 *
 * Example period names: "January 2025", "Q1 2025", "Week 1 - Jan 2025"
 */
export class CreateCostPeriodDto {
  /**
   * Project UUID
   * The project this cost period belongs to
   */
  @ApiProperty({
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  /**
   * Budget UUID
   * The budget this cost period tracks costs against
   */
  @ApiProperty({
    description: 'Budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;

  /**
   * Period Name
   * Human-readable name for the cost period (e.g., "January 2025")
   */
  @ApiProperty({
    description: 'Period name (e.g., "January 2025", "Q1 2025")',
    example: 'January 2025',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  periodName!: string;

  /**
   * Period Start Date
   * Beginning date of the cost period (ISO 8601 format)
   */
  @ApiProperty({
    description: 'Period start date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  /**
   * Period End Date
   * Ending date of the cost period (ISO 8601 format)
   * Must be after periodStart
   */
  @ApiProperty({
    description: 'Period end date (ISO 8601) - must be after periodStart',
    example: '2025-01-31',
  })
  @IsDateString()
  @IsNotEmpty()
  @IsAfterDate('periodStart', {
    message: 'Period end date must be after period start date',
  })
  periodEnd!: string;
}
