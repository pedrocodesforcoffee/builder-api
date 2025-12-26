import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Create Cost Transfer DTO
 *
 * Data Transfer Object for creating a new cost transfer between cost codes.
 * Cost transfers allow project teams to reallocate budget amounts between
 * different cost codes within the same budget.
 *
 * Cost transfers follow a workflow:
 * 1. DRAFT - Initial creation, can be edited
 * 2. PENDING_APPROVAL - Submitted for approval
 * 3. APPROVED - Approved and cost entries created (debit from source, credit to target)
 * 4. REJECTED - Request denied
 * 5. VOID - Approved transfer that has been reversed
 *
 * When approved, the system creates two CostEntry records:
 * - One debiting (negative) the fromCostCode
 * - One crediting (positive) the toCostCode
 *
 * This maintains a complete audit trail of all budget movements.
 */
export class CreateCostTransferDto {
  /**
   * Project UUID
   * The project this cost transfer belongs to
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
   * The budget containing the cost codes for this transfer
   */
  @ApiProperty({
    description: 'Budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;

  /**
   * From Cost Code UUID
   * The source cost code to transfer funds FROM (will be debited)
   */
  @ApiProperty({
    description: 'Source cost code UUID (funds transferred FROM)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  fromCostCodeId!: string;

  /**
   * To Cost Code UUID
   * The target cost code to transfer funds TO (will be credited)
   */
  @ApiProperty({
    description: 'Target cost code UUID (funds transferred TO)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsNotEmpty()
  toCostCodeId!: string;

  /**
   * Transfer Amount
   * The amount to transfer between cost codes (must be positive, minimum $0.01)
   */
  @ApiProperty({
    description: 'Amount to transfer between cost codes',
    example: 25000.00,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  /**
   * Transfer Reason
   * Detailed explanation for why this transfer is necessary
   * Must be at least 10 characters to ensure adequate justification
   */
  @ApiProperty({
    description: 'Detailed reason for the cost transfer (minimum 10 characters)',
    example: 'Reallocating funds from masonry to electrical due to scope change in building facade design per client request on 2024-01-15',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
