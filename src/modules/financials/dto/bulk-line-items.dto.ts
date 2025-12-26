import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * Bulk Create Line Item DTO
 *
 * Individual line item for bulk creation.
 */
export class BulkCreateLineItemDto {
  @ApiProperty({
    description: 'Cost code ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  costCodeId!: string;

  @ApiProperty({
    description: 'Category',
    enum: BudgetCategory,
    example: BudgetCategory.LABOR,
  })
  @IsEnum(BudgetCategory)
  category!: BudgetCategory;

  @ApiProperty({
    description: 'Budgeted cost',
    example: 100000.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  budgetedCost!: number;

  @ApiProperty({
    description: 'Quantity (optional)',
    required: false,
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({
    description: 'Unit of measure (optional)',
    required: false,
    example: 'hours',
  })
  @IsOptional()
  @IsNumber()
  unitOfMeasure?: string;

  @ApiProperty({
    description: 'Unit price (optional)',
    required: false,
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({
    description: 'Notes (optional)',
    required: false,
    example: 'Labor costs for general requirements',
  })
  @IsOptional()
  notes?: string;
}

/**
 * Bulk Create Line Items Request DTO
 *
 * Parameters for bulk creating multiple line items.
 */
export class BulkCreateLineItemsDto {
  @ApiProperty({
    description: 'Array of line items to create',
    type: [BulkCreateLineItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateLineItemDto)
  lineItems!: BulkCreateLineItemDto[];
}

/**
 * Bulk Update Line Item DTO
 *
 * Individual line item for bulk update.
 */
export class BulkUpdateLineItemDto {
  @ApiProperty({
    description: 'Line item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'Budgeted cost (optional)',
    required: false,
    example: 100000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetedCost?: number;

  @ApiProperty({
    description: 'Quantity (optional)',
    required: false,
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({
    description: 'Unit price (optional)',
    required: false,
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({
    description: 'Notes (optional)',
    required: false,
    example: 'Updated labor costs',
  })
  @IsOptional()
  notes?: string;
}

/**
 * Bulk Update Line Items Request DTO
 *
 * Parameters for bulk updating multiple line items.
 */
export class BulkUpdateLineItemsDto {
  @ApiProperty({
    description: 'Array of line items to update',
    type: [BulkUpdateLineItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateLineItemDto)
  lineItems!: BulkUpdateLineItemDto[];
}

/**
 * Reorder Line Items DTO
 *
 * Parameters for reordering line items within a budget.
 */
export class ReorderLineItemsDto {
  @ApiProperty({
    description: 'Array of line item IDs in the desired order',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174111',
      '123e4567-e89b-12d3-a456-426614174222',
    ],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  lineItemIds!: string[];
}
