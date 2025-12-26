import { Expose, Type } from 'class-transformer';
import { BudgetStatus, BudgetCategory } from '../enums';

/**
 * Response DTO for budget data
 *
 * Used for API responses. Exposes only the fields that should be sent to clients.
 */
export class BudgetResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  status!: BudgetStatus;

  @Expose()
  category!: BudgetCategory;

  @Expose()
  totalAmount!: number;

  @Expose()
  projectId!: string;

  @Expose()
  notes?: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;
}
