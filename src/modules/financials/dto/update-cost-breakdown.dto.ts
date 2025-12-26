import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOcoCostBreakdownDto } from './create-oco-cost-breakdown.dto';

/**
 * Update Cost Breakdown DTO
 *
 * DTO for updating OCO cost breakdown.
 * Replaces all existing cost breakdown items with the provided array.
 */
export class UpdateCostBreakdownDto {
  @ApiProperty({
    description: 'Array of cost breakdown items',
    type: [CreateOcoCostBreakdownDto],
    example: [
      {
        costCodeId: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Additional structural work',
        amount: 15000,
        order: 0,
      },
      {
        costCodeId: '223e4567-e89b-12d3-a456-426614174001',
        description: 'MEP modifications',
        amount: 8500,
        order: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOcoCostBreakdownDto)
  items!: CreateOcoCostBreakdownDto[];
}
