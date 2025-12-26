import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { BudgetCategory } from '../enums/budget-category.enum';

export class CreateBudgetLineItemDto {
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;

  @IsUUID()
  @IsNotEmpty()
  costCodeId!: string;

  @IsEnum(BudgetCategory)
  @IsNotEmpty()
  category!: BudgetCategory;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  budgetedCost!: number;
}
