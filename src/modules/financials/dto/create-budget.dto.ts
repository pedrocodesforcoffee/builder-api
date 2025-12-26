import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDecimal,
  MaxLength,
  Min,
} from 'class-validator';
import { BudgetStatus, BudgetCategory } from '../enums';

/**
 * DTO for creating a new budget
 *
 * Budgets track financial planning at the project level.
 * They can be original budgets, revised budgets, or change orders.
 */
export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(BudgetStatus)
  @IsOptional()
  status?: BudgetStatus;

  @IsEnum(BudgetCategory)
  @IsNotEmpty()
  category!: BudgetCategory;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  totalAmount!: number;

  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
