import { Expose, Type } from 'class-transformer';
import { BudgetLineItemResponseDto } from './budget-line-item-response.dto';

/**
 * Paginated Line Items Response DTO
 *
 * Wraps line items array with pagination metadata
 */
export class PaginatedLineItemsResponseDto {
  @Expose()
  @Type(() => BudgetLineItemResponseDto)
  data!: BudgetLineItemResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  skip!: number;

  @Expose()
  take!: number;
}
