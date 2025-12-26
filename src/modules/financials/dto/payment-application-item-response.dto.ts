import { Expose, Type } from 'class-transformer';

/**
 * Response DTO for Payment Application line item (AIA G703)
 */
export class PaymentApplicationItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  paymentApplicationId!: string;

  @Expose()
  sovItemId!: string;

  @Expose()
  lineNumber!: number;

  @Expose()
  description!: string;

  @Expose()
  scheduledValue!: number;

  // Progress this period
  @Expose()
  workCompletedThisPeriod!: number;

  @Expose()
  materialsStoredThisPeriod!: number;

  // Cumulative totals
  @Expose()
  totalWorkCompleted!: number;

  @Expose()
  totalMaterialsStored!: number;

  @Expose()
  totalCompletedAndStored!: number;

  // Calculated fields
  @Expose()
  percentComplete!: number;

  @Expose()
  balanceToFinish!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
