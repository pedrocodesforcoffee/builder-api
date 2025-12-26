import { Expose, Type } from 'class-transformer';

export class OcoCostBreakdownResponseDto {
  @Expose()
  id!: string;

  @Expose()
  ocoId!: string;

  @Expose()
  costCodeId?: string;

  @Expose()
  description!: string;

  @Expose()
  amount!: number;

  @Expose()
  order!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
