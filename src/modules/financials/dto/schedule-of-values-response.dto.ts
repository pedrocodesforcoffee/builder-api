import { Expose, Type } from 'class-transformer';
import { ScheduleOfValuesItemResponseDto } from './schedule-of-values-item-response.dto';

/**
 * Response DTO for Schedule of Values
 */
export class ScheduleOfValuesResponseDto {
  @Expose()
  id!: string;

  @Expose()
  commitmentId!: string;

  @Expose()
  projectId!: string;

  @Expose()
  createdById!: string;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  /**
   * SOV line items
   * Included when requested with relations
   */
  @Expose()
  @Type(() => ScheduleOfValuesItemResponseDto)
  items?: ScheduleOfValuesItemResponseDto[];

  /**
   * Total scheduled value
   * Sum of all line item scheduled values
   * Calculated property
   */
  @Expose()
  totalScheduledValue?: number;
}
