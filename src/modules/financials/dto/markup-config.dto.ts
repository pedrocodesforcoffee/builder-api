import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Markup Configuration DTO
 *
 * Defines markup percentages for change order cost calculations.
 * Used to apply overhead, profit, bond, and insurance to direct costs.
 *
 * Calculation order:
 * 1. Direct costs (labor, material, equipment, subcontract, other)
 * 2. Overhead (percentage of direct costs)
 * 3. Profit (percentage of direct costs + overhead)
 * 4. Bond (percentage of direct costs + overhead + profit)
 * 5. Insurance (percentage of direct costs + overhead + profit)
 */
export class MarkupConfigDto {
  @ApiProperty({
    description: 'Overhead percentage (0-100)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overheadPercent?: number;

  @ApiProperty({
    description: 'Profit percentage (0-100)',
    example: 15,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  profitPercent?: number;

  @ApiProperty({
    description: 'Bond percentage (0-100)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bondPercent?: number;

  @ApiProperty({
    description: 'Insurance percentage (0-100)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  insurancePercent?: number;
}
