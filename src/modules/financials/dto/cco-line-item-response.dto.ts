import { Expose, Type } from 'class-transformer';

export class CcoLineItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  ccoId!: string;

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
