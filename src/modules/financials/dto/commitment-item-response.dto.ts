import { Expose, Type } from 'class-transformer';
import { BudgetCategory } from '../enums/budget-category.enum';

export class CommitmentItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  commitmentId!: string;

  @Expose()
  costCodeId!: string;

  @Expose()
  category!: BudgetCategory;

  @Expose()
  description?: string;

  @Expose()
  quantity?: number;

  @Expose()
  unitCost?: number;

  @Expose()
  amount!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
