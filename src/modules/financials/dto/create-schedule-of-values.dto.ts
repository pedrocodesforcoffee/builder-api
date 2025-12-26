import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleOfValuesItemDto } from './create-schedule-of-values-item.dto';

/**
 * DTO for creating a Schedule of Values (SOV)
 *
 * Creates an SOV for a commitment with line items.
 * Each commitment can only have one SOV (enforced at entity level).
 */
export class CreateScheduleOfValuesDto {
  /**
   * Commitment ID
   * The commitment this SOV belongs to (must exist)
   */
  @IsUUID()
  @IsNotEmpty()
  commitmentId!: string;

  /**
   * Project ID
   * Denormalized for efficient queries
   */
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  /**
   * SOV Line Items
   * Must have at least one line item
   * Each item defines a billable scope of work with cost code mapping
   */
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Schedule of Values must have at least one line item' })
  @Type(() => CreateScheduleOfValuesItemDto)
  items!: CreateScheduleOfValuesItemDto[];
}
