import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

/**
 * Clone Budget DTO
 *
 * Parameters for cloning an existing budget.
 */
export class CloneBudgetDto {
  @ApiProperty({
    description: 'Name for the cloned budget',
    example: 'Revised Budget - March 2024',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Description for the cloned budget (optional)',
    example: 'Budget revised after Change Order #123',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether to clone line items (default: true)',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeLineItems?: boolean = true;
}
