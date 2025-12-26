import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * DTO for creating a Payment Application line item
 *
 * Each item tracks work completed and materials stored for a specific SOV line item.
 */
export class CreatePaymentApplicationItemDto {
  /**
   * Schedule of Values Item ID
   * The SOV item this payment application item is billing against
   */
  @IsUUID()
  @IsNotEmpty()
  sovItemId!: string;

  /**
   * Work completed this period
   * The value of work completed during this billing period
   * Must be non-negative
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  workCompletedThisPeriod!: number;

  /**
   * Materials stored this period
   * The value of materials delivered and stored on-site during this period
   * Must be non-negative
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  materialsStoredThisPeriod!: number;
}
