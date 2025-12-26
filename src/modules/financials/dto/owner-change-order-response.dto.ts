import { Expose, Type } from 'class-transformer';
import { OcoStatus } from '../enums/oco-status.enum';
import { OcoChangeType } from '../enums/oco-change-type.enum';
import { CoPriority } from '../enums/co-priority.enum';

export class OwnerChangeOrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  primeContractId!: string;

  @Expose()
  pcoId?: string;

  @Expose()
  ocoNumber!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: OcoStatus;

  @Expose()
  changeType!: OcoChangeType;

  @Expose()
  priority?: CoPriority;

  @Expose()
  amount!: number;

  @Expose()
  reason?: string;

  @Expose()
  scheduleImpactDays?: number;

  @Expose()
  @Type(() => Date)
  submittedAt?: Date;

  @Expose()
  submittedById?: string;

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
  @Type(() => Date)
  executedAt?: Date;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @Expose()
  createdById!: string;
}
