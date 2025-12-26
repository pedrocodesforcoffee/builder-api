import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
  IsInt,
} from 'class-validator';

/**
 * DTO for creating a Schedule of Values line item
 *
 * Each line item represents a billable scope of work mapped to a cost code.
 */
export class CreateScheduleOfValuesItemDto {
  /**
   * Cost code ID
   * Maps this line item to a budget cost code for tracking
   */
  @IsUUID()
  @IsNotEmpty()
  costCodeId!: string;

  /**
   * Line number (1-based)
   * Sequential number for ordering on AIA G703 form
   * Must be unique within the SOV
   */
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  lineNumber!: number;

  /**
   * Description of work
   * Describes the scope of work for this line item
   * Example: "Concrete formwork - 2nd floor slab"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  /**
   * Scheduled value
   * The contract amount allocated for this scope of work
   * Must be positive
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Scheduled value must be greater than zero' })
  @IsNotEmpty()
  scheduledValue!: number;
}
