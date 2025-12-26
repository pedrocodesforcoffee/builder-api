import { Expose, Type } from 'class-transformer';
import { BudgetCategory } from '../enums/budget-category.enum';
import { CostCode } from '../entities/cost-code.entity';

export class BudgetLineItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  budgetId!: string;

  @Expose()
  costCodeId!: string;

  @Expose()
  costCode?: CostCode;

  @Expose()
  category!: BudgetCategory;

  @Expose()
  description?: string;

  @Expose()
  quantity?: number;

  @Expose()
  unitCost?: number;

  @Expose()
  budgetedCost!: number;

  @Expose()
  committedCost!: number;

  @Expose()
  actualCost!: number;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
