import { Expose, Type } from 'class-transformer';

export class PcoCostTierResponseDto {
  @Expose()
  id!: string;

  @Expose()
  pcoId!: string;

  @Expose()
  costCodeId?: string;

  @Expose()
  description!: string;

  @Expose()
  quantity?: number;

  @Expose()
  unit?: string;

  @Expose()
  unitCost?: number;

  @Expose()
  directCost!: number;

  @Expose()
  order!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
