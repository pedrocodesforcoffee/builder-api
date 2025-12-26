import { Expose, Type } from 'class-transformer';

export class CcoTmEntryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  ccoId!: string;

  @Expose()
  @Type(() => Date)
  date!: Date;

  @Expose()
  description!: string;

  @Expose()
  laborHours?: number;

  @Expose()
  laborRate?: number;

  @Expose()
  laborCost?: number;

  @Expose()
  equipmentHours?: number;

  @Expose()
  equipmentRate?: number;

  @Expose()
  equipmentCost?: number;

  @Expose()
  materialCost?: number;

  @Expose()
  totalCost!: number;

  @Expose()
  approved!: boolean;

  @Expose()
  @Type(() => Date)
  approvedAt?: Date;

  @Expose()
  approvedById?: string;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
