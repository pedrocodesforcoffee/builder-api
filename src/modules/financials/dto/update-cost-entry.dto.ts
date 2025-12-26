import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { CostEntryType } from '../enums/cost-entry-type.enum';

/**
 * Update Cost Entry DTO
 *
 * Data Transfer Object for updating an existing cost entry.
 * All fields are optional, allowing partial updates to cost entries
 * that are still in DRAFT status.
 *
 * Note: Only cost entries in DRAFT status can be updated.
 * Posted, voided, or approved entries cannot be modified.
 */
export class UpdateCostEntryDto {
  /**
   * Cost Code UUID (Optional)
   * Update the cost code (budget line item) this cost is allocated to
   */
  @ApiPropertyOptional({
    description: 'Cost Code UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  costCodeId?: string;

  /**
   * Cost Entry Type (Optional)
   * Update the category of cost being tracked
   */
  @ApiPropertyOptional({
    description: 'Cost entry type',
    enum: CostEntryType,
    example: CostEntryType.MATERIAL,
  })
  @IsOptional()
  @IsEnum(CostEntryType)
  type?: CostEntryType;

  /**
   * Entry Date (Optional)
   * Update the date this cost was incurred
   */
  @ApiPropertyOptional({
    description: 'Date the cost was incurred (ISO 8601)',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  /**
   * Description (Optional)
   * Update the detailed description of the cost entry
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the cost entry',
    example: 'Concrete materials for foundation pour',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * Total Cost (Optional)
   * Update the total cost amount for this entry
   */
  @ApiPropertyOptional({
    description: 'Total cost amount',
    example: 15000.50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCost?: number;

  /**
   * Quantity (Optional)
   * Update the number of units for this cost entry
   */
  @ApiPropertyOptional({
    description: 'Quantity of units',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity?: number;

  /**
   * Unit Cost (Optional)
   * Update the cost per unit
   */
  @ApiPropertyOptional({
    description: 'Cost per unit',
    example: 150.50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost?: number;

  /**
   * Vendor (Optional)
   * Update the vendor or supplier name
   */
  @ApiPropertyOptional({
    description: 'Vendor or supplier name',
    example: 'ABC Supply Co.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  /**
   * Invoice Number (Optional)
   * Update the reference invoice or bill number
   */
  @ApiPropertyOptional({
    description: 'Invoice or bill number',
    example: 'INV-2024-001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  /**
   * Commitment UUID (Optional)
   * Update the link to a commitment
   */
  @ApiPropertyOptional({
    description: 'Commitment UUID (if cost is linked to a commitment)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  commitmentId?: string;

  /**
   * Payment Application UUID (Optional)
   * Update the link to a payment application
   */
  @ApiPropertyOptional({
    description: 'Payment Application UUID (if cost is from a payment application)',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsOptional()
  @IsUUID()
  paymentApplicationId?: string;

  /**
   * Cost Period UUID (Optional)
   * Update the link to a cost period
   */
  @ApiPropertyOptional({
    description: 'Cost Period UUID (for period-based cost tracking)',
    example: '123e4567-e89b-12d3-a456-426614174005',
  })
  @IsOptional()
  @IsUUID()
  costPeriodId?: string;
}
