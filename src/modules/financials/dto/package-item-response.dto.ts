import { Expose, Type } from 'class-transformer';

export class PackageItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  packageId!: string;

  @Expose()
  changeOrderType!: 'PCO' | 'OCO' | 'CCO';

  @Expose()
  pcoId?: string;

  @Expose()
  ocoId?: string;

  @Expose()
  ccoId?: string;

  @Expose()
  order!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}
