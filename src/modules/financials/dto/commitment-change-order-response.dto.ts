import { Expose, Type } from 'class-transformer';
import { CcoStatus } from '../enums/cco-status.enum';
import { CcoChangeType } from '../enums/cco-change-type.enum';

export class CommitmentChangeOrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  commitmentId!: string;

  @Expose()
  ocoId?: string;

  @Expose()
  ccoNumber!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: CcoStatus;

  @Expose()
  changeType!: CcoChangeType;

  @Expose()
  amount!: number;

  @Expose()
  isTimeAndMaterial!: boolean;

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
