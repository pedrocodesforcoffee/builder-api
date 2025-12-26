import { Expose, Type } from 'class-transformer';
import { LienWaiverType } from '../enums/lien-waiver-type.enum';

/**
 * Response DTO for Lien Waiver
 */
export class LienWaiverResponseDto {
  @Expose()
  id!: string;

  @Expose()
  paymentApplicationId!: string;

  @Expose()
  commitmentId!: string;

  @Expose()
  projectId!: string;

  @Expose()
  type!: LienWaiverType;

  @Expose()
  amount!: number;

  @Expose()
  @Type(() => Date)
  throughDate!: Date;

  @Expose()
  documentUrl!: string;

  @Expose()
  fileName!: string;

  @Expose()
  fileSize!: number;

  @Expose()
  mimeType!: string;

  @Expose()
  uploadedById!: string;

  @Expose()
  @Type(() => Date)
  uploadedAt!: Date;

  @Expose()
  notes?: string;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
