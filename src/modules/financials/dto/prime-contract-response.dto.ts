import { Expose, Type } from 'class-transformer';
import { PrimeContractStatus } from '../enums/prime-contract-status.enum';

export class PrimeContractResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  number!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: PrimeContractStatus;

  @Expose()
  originalAmount!: number;

  @Expose()
  currentAmount!: number;

  @Expose()
  retentionPercentage!: number;

  @Expose()
  @Type(() => Date)
  startDate?: Date;

  @Expose()
  @Type(() => Date)
  endDate?: Date;

  @Expose()
  @Type(() => Date)
  completionDate?: Date;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
