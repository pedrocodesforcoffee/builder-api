import { Expose, Type } from 'class-transformer';

/**
 * Response DTO for Schedule of Values line item
 */
export class ScheduleOfValuesItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  sovId!: string;

  @Expose()
  costCodeId!: string;

  @Expose()
  lineNumber!: number;

  @Expose()
  description!: string;

  @Expose()
  scheduledValue!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
