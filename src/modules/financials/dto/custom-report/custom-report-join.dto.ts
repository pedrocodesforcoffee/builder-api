import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JoinType } from '../../entities/custom-report.entity';

/**
 * Custom Report Join DTO
 *
 * Defines how to join additional entities to the primary entity in a custom report.
 */
export class CustomReportJoinDto {
  @ApiProperty({
    description: 'Entity to join (e.g., "BudgetLineItem", "CostCode")',
    example: 'BudgetLineItem',
  })
  @IsString()
  entity!: string;

  @ApiProperty({
    description: 'Alias for the joined entity',
    example: 'lineItem',
  })
  @IsString()
  alias!: string;

  @ApiProperty({
    description: 'Join condition (e.g., "budget.id = lineItem.budgetId")',
    example: 'budget.id = lineItem.budgetId',
  })
  @IsString()
  on!: string;

  @ApiProperty({
    description: 'Join type',
    enum: JoinType,
    example: JoinType.LEFT,
  })
  @IsEnum(JoinType)
  type!: JoinType;
}
