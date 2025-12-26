import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePaymentApplicationItemDto } from './create-payment-application-item.dto';

/**
 * DTO for creating a Payment Application (AIA G702/G703)
 *
 * Creates a new payment application against an existing Schedule of Values.
 * The application number is auto-generated (sequential per commitment).
 */
export class CreatePaymentApplicationDto {
  /**
   * Schedule of Values ID
   * The SOV this payment application is billing against
   */
  @IsUUID()
  @IsNotEmpty()
  sovId!: string;

  /**
   * Commitment ID
   * Denormalized for efficient queries
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
   * Application date
   * The date this payment application was created
   */
  @IsDateString()
  @IsNotEmpty()
  applicationDate!: string;

  /**
   * Period start date
   * Start of the billing period covered by this application
   */
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  /**
   * Period end date
   * End of the billing period covered by this application
   */
  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  /**
   * Retainage percentage (optional)
   * Percentage to withhold (e.g., 10 = 10%)
   * If not provided, uses commitment's retentionPercent
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  retainagePercent?: number;

  /**
   * Payment Application Items
   * Must have at least one line item
   * Each item tracks work completed and materials stored for a SOV item
   */
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Payment application must have at least one line item' })
  @Type(() => CreatePaymentApplicationItemDto)
  items!: CreatePaymentApplicationItemDto[];
}
