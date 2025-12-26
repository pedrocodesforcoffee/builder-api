import { Expose, Type } from 'class-transformer';
import { CoPackageStatus } from '../enums/co-package-status.enum';

export class ChangeOrderPackageResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  packageNumber!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: CoPackageStatus;

  @Expose()
  totalAmount!: number;

  @Expose()
  @Type(() => Date)
  submittedAt?: Date;

  @Expose()
  @Type(() => Date)
  approvedAt?: Date;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @Expose()
  createdById!: string;
}
