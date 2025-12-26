import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  Min,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { LienWaiverType } from '../enums/lien-waiver-type.enum';

/**
 * DTO for creating a Lien Waiver
 *
 * Lien waivers protect property owners from future mechanic's liens
 * by documenting that payment has been or will be received.
 */
export class CreateLienWaiverDto {
  /**
   * Payment Application ID
   */
  @IsUUID()
  @IsNotEmpty()
  paymentApplicationId!: string;

  /**
   * Lien waiver type
   * CONDITIONAL: Effective upon payment clearing
   * UNCONDITIONAL: Effective immediately
   */
  @IsEnum(LienWaiverType)
  @IsNotEmpty()
  type!: LienWaiverType;

  /**
   * Waiver amount
   * The amount of payment covered by this waiver
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  /**
   * Through date
   * The date through which lien rights are waived
   */
  @IsDateString()
  @IsNotEmpty()
  throughDate!: string;

  /**
   * Document URL (S3 or file path)
   * Location where the signed waiver document is stored
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  documentUrl!: string;

  /**
   * File name
   * Original name of the uploaded file
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  /**
   * File size (bytes)
   */
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  fileSize!: number;

  /**
   * MIME type
   * Example: application/pdf, image/jpeg
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;

  /**
   * Notes or comments about this waiver
   */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
