import { Expose, Type } from 'class-transformer';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';
import { PaymentApplicationItemResponseDto } from './payment-application-item-response.dto';

/**
 * Response DTO for Payment Application (AIA G702)
 */
export class PaymentApplicationResponseDto {
  @Expose()
  id!: string;

  @Expose()
  sovId!: string;

  @Expose()
  commitmentId!: string;

  @Expose()
  projectId!: string;

  @Expose()
  applicationNumber!: number;

  @Expose()
  @Type(() => Date)
  applicationDate!: Date;

  @Expose()
  @Type(() => Date)
  periodStart!: Date;

  @Expose()
  @Type(() => Date)
  periodEnd!: Date;

  @Expose()
  status!: PaymentApplicationStatus;

  // Financial totals (AIA G702 calculations)
  @Expose()
  totalCompletedAndStored!: number;

  @Expose()
  retainagePercent!: number;

  @Expose()
  retainageAmount!: number;

  @Expose()
  totalEarnedLessRetainage!: number;

  @Expose()
  previousPayments!: number;

  @Expose()
  currentPaymentDue!: number;

  @Expose()
  balanceToFinish!: number;

  // Workflow tracking
  @Expose()
  submittedById?: string;

  @Expose()
  @Type(() => Date)
  submittedAt?: Date;

  @Expose()
  approvedById?: string;

  @Expose()
  @Type(() => Date)
  approvedAt?: Date;

  @Expose()
  rejectedById?: string;

  @Expose()
  @Type(() => Date)
  rejectedAt?: Date;

  @Expose()
  rejectionReason?: string;

  @Expose()
  paidById?: string;

  @Expose()
  @Type(() => Date)
  paidAt?: Date;

  // Lien waiver tracking
  @Expose()
  hasConditionalWaiver!: boolean;

  @Expose()
  hasUnconditionalWaiver!: boolean;

  // PDF URLs
  @Expose()
  g702PdfUrl?: string;

  @Expose()
  g703PdfUrl?: string;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  /**
   * Payment application items (AIA G703)
   * Included when requested with relations
   */
  @Expose()
  @Type(() => PaymentApplicationItemResponseDto)
  items?: PaymentApplicationItemResponseDto[];
}
