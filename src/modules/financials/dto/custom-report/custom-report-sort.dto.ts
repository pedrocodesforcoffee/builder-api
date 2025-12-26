import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Custom Report Sort DTO
 *
 * Defines sorting rules for a custom report.
 */
export class CustomReportSortDto {
  @ApiProperty({
    description: 'Field to sort by (e.g., "costCode.code", "budget.totalBudget")',
    example: 'costCode.code',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Sort direction',
    enum: SortDirection,
    example: SortDirection.ASC,
  })
  @IsEnum(SortDirection)
  direction!: SortDirection;
}
