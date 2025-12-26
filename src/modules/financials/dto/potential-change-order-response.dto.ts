import { Expose, Type } from 'class-transformer';
import { PcoStatus } from '../enums/pco-status.enum';
import { CoPriority } from '../enums/co-priority.enum';

export class PotentialChangeOrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  primeContractId!: string;

  @Expose()
  pcoNumber!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: PcoStatus;

  @Expose()
  priority?: CoPriority;

  @Expose()
  directCost!: number;

  @Expose()
  overheadAmount!: number;

  @Expose()
  overheadPercent!: number;

  @Expose()
  profitAmount!: number;

  @Expose()
  profitPercent!: number;

  @Expose()
  contingencyAmount!: number;

  @Expose()
  contingencyPercent!: number;

  @Expose()
  totalAmount!: number;

  @Expose()
  @Type(() => Date)
  submittedAt?: Date;

  @Expose()
  submittedById?: string;

  @Expose()
  @Type(() => Date)
  reviewedAt?: Date;

  @Expose()
  reviewedById?: string;

  @Expose()
  @Type(() => Date)
  approvedAt?: Date;

  @Expose()
  approvedById?: string;

  @Expose()
  @Type(() => Date)
  rejectedAt?: Date;

  @Expose()
  rejectedById?: string;

  @Expose()
  rejectionReason?: string;

  @Expose()
  convertedToOcoId?: string;

  @Expose()
  @Type(() => Date)
  convertedAt?: Date;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @Expose()
  createdById!: string;
}
