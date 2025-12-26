import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
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
 * Create Cost Entry DTO
 *
 * Data Transfer Object for creating a new cost entry in the system.
 * Cost entries track actual costs incurred on a project and are posted
 * to budget line items to track spending against the budget.
 *
 * Cost entries can represent various types of costs including labor,
 * materials, equipment, subcontractor invoices, and other direct costs.
 * They can be linked to commitments, payment applications, and cost periods
 * for comprehensive cost tracking and reporting.
 */
export class CreateCostEntryDto {
  /**
   * Project UUID
   * The project this cost entry belongs to
   */
  @ApiProperty({
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  /**
   * Budget UUID
   * The budget this cost entry is posted to
   */
  @ApiProperty({
    description: 'Budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;

  /**
   * Cost Code UUID
   * The cost code (budget line item) this cost is allocated to
   */
  @ApiProperty({
    description: 'Cost Code UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  costCodeId!: string;

  /**
   * Cost Entry Type
   * The category of cost being tracked
   */
  @ApiProperty({
    description: 'Cost entry type',
    enum: CostEntryType,
    example: CostEntryType.MATERIAL,
  })
  @IsEnum(CostEntryType)
  @IsNotEmpty()
  type!: CostEntryType;

  /**
   * Entry Date
   * The date this cost was incurred (ISO 8601 format)
   */
  @ApiProperty({
    description: 'Date the cost was incurred (ISO 8601)',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  entryDate!: string;

  /**
   * Description
   * Detailed description of the cost entry
   */
  @ApiProperty({
    description: 'Detailed description of the cost entry',
    example: 'Concrete materials for foundation pour',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  /**
   * Total Cost
   * The total cost amount for this entry (must be non-negative)
   */
  @ApiProperty({
    description: 'Total cost amount',
    example: 15000.50,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  totalCost!: number;

  /**
   * Quantity (Optional)
   * Number of units for this cost entry
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
   * Cost per unit (should equal totalCost / quantity if both provided)
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
   * Name of the vendor or supplier
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
   * Reference invoice or bill number
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
   * Link to a commitment (subcontract/purchase order) if applicable
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
   * Link to a payment application if this cost is from a subcontractor billing
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
   * Link to a cost period for period-based cost tracking
   */
  @ApiPropertyOptional({
    description: 'Cost Period UUID (for period-based cost tracking)',
    example: '123e4567-e89b-12d3-a456-426614174005',
  })
  @IsOptional()
  @IsUUID()
  costPeriodId?: string;
}
