import { PartialType } from '@nestjs/mapped-types';
import { CreateBudgetLineItemDto } from './create-budget-line-item.dto';

export class UpdateBudgetLineItemDto extends PartialType(
  CreateBudgetLineItemDto,
) {}
