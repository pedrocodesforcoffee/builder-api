import { Expose, Type } from 'class-transformer';
import { CommitmentType } from '../enums/commitment-type.enum';
import { CommitmentStatus } from '../enums/commitment-status.enum';

export class CommitmentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  number!: string;

  @Expose()
  type!: CommitmentType;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: CommitmentStatus;

  @Expose()
  folderId?: string;

  @Expose()
  vendorName!: string;

  @Expose()
  vendorContact?: string;

  @Expose()
  vendorEmail?: string;

  @Expose()
  originalAmount!: number;

  @Expose()
  currentAmount!: number;

  @Expose()
  @Type(() => Date)
  startDate?: Date;

  @Expose()
  @Type(() => Date)
  endDate?: Date;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
